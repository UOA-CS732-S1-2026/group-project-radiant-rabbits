import {
  fetchCommits,
  fetchIssues,
  fetchProjectTasks,
  fetchPullRequests,
  GitHubApiError,
  GitHubRateLimitError,
} from "./githubService";
import {
  Commit,
  Contributor,
  Group,
  Issue,
  PullRequest,
  SprintTask,
} from "./models";
import connectMongoDB from "./mongodbConnection";

// Invalidate all dashboard cache keys using Redis for a group after new data is synced
async function invalidateDashboardCache(groupId: string) {
  if (!process.env.REDIS_URL) return;
  try {
    const { default: Redis } = await import("ioredis");
    const redis = new Redis(process.env.REDIS_URL);
    const keys = await redis.keys(`dashboard:${groupId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await redis.quit();
  } catch {
    // If Redis is unavailable, still serve stale data until the next successful sync
  }
}

// This function orchestrates the entire sync process:
//   1. Mark group as syncing
//   2. Fetch data from GitHub
//   3. Upsert everything into MongoDB
//   4. Update group status to success/failed
//
// Called after group creation (automatic) or manually via the sync endpoint.

export async function syncGroup(groupId: string, accessToken: string) {
  await connectMongoDB();

  // Look up the group to get repo details and lastSyncAt
  const group = await Group.findById(groupId);
  if (!group) {
    throw new Error(`Group ${groupId} not found`);
  }

  // We need both to know which GitHub repo to fetch from
  const { repoOwner, repoName } = group;
  if (!repoOwner || !repoName) {
    await Group.findByIdAndUpdate(groupId, {
      syncStatus: "failed",
      syncError: "Group is missing repoOwner or repoName",
    });
    return;
  }

  // Mark the group as currently syncing so the UI can show a loading state
  await Group.findByIdAndUpdate(groupId, {
    syncStatus: "in_progress",
    syncError: null,
  });

  try {
    const hasExistingSyncedData = await hasExistingGroupData(groupId);

    // If we've synced before, only fetch data newer than lastSyncAt (incremental).
    // On first sync, `since` is undefined so we fetch everything.
    const since =
      group.lastSyncAt && hasExistingSyncedData
        ? group.lastSyncAt.toISOString()
        : undefined;

    // Fetch all data from GitHub in parallel - can run them at the same time
    const [commits, pullRequests, issues, projectTasks] = await Promise.all([
      fetchCommits(accessToken, repoOwner, repoName, since),
      fetchPullRequests(accessToken, repoOwner, repoName, since),
      fetchIssues(accessToken, repoOwner, repoName, since),
      fetchProjectTasks(accessToken, repoOwner, repoName),
    ]);

    // Upsert all fetched data into MongoDB
    await Promise.all([
      upsertCommits(groupId, commits),
      upsertPullRequests(groupId, pullRequests),
      upsertIssues(groupId, issues),
      upsertContributors(groupId, commits),
      upsertSprintTasks(groupId, projectTasks),
    ]);

    // Sync succeeded - update the group's status and timestamp
    await Group.findByIdAndUpdate(groupId, {
      lastSyncAt: new Date(),
      syncStatus: "success",
      syncError: null,
    });

    // Invalidate dashboard cache for this group so fresh data is served
    await invalidateDashboardCache(groupId);
  } catch (error) {
    // Handle different error types with appropriate status
    await handleSyncError(groupId, error, accessToken);
  }
}

// Helper function to check for any existing group data
async function hasExistingGroupData(groupId: string): Promise<boolean> {
  const [commitDoc, pullRequestDoc, issueDoc] = await Promise.all([
    Commit.findOne({ group: groupId }).select("_id").lean(),
    PullRequest.findOne({ group: groupId }).select("_id").lean(),
    Issue.findOne({ group: groupId }).select("_id").lean(),
  ]);

  return Boolean(commitDoc || pullRequestDoc || issueDoc);
}

// Upsert functions (update if exists, insert if not)
// Match by the unique compound key (e.g., sha + group for commits) meaning:
//   - First sync: all records are inserted (new)
//   - Later syncs: existing records are updated, new ones are inserted

async function upsertCommits(
  groupId: string,
  commits: Awaited<ReturnType<typeof fetchCommits>>,
) {
  // Build bulk operations - sends everything to MongoDB in a single network request
  const operations = commits.map((commit) => ({
    updateOne: {
      filter: { sha: commit.sha, group: groupId },
      update: {
        $set: {
          message: commit.message,
          author: commit.author,
          date: new Date(commit.date),
          filesChanged: commit.filesChanged,
          group: groupId,
        },
        // $setOnInsert only runs when creating a new document, not on updates - use it for sha since it never changes
        $setOnInsert: { sha: commit.sha },
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await Commit.bulkWrite(operations);
  }
}

async function upsertPullRequests(
  groupId: string,
  pullRequests: Awaited<ReturnType<typeof fetchPullRequests>>,
) {
  const operations = pullRequests.map((pr) => ({
    updateOne: {
      // Match by PR number + group - each PR number is unique within a repo
      filter: { number: pr.number, group: groupId },
      update: {
        $set: {
          title: pr.title,
          state: pr.state,
          createdAt: new Date(pr.createdAt),
          closedAt: pr.closedAt ? new Date(pr.closedAt) : null,
          mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
          author: pr.author,
          group: groupId,
        },
        $setOnInsert: { number: pr.number },
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await PullRequest.bulkWrite(operations);
  }
}

async function upsertIssues(
  groupId: string,
  issues: Awaited<ReturnType<typeof fetchIssues>>,
) {
  const operations = issues.map((issue) => ({
    updateOne: {
      filter: { number: issue.number, group: groupId },
      update: {
        $set: {
          title: issue.title,
          state: issue.state,
          createdAt: new Date(issue.createdAt),
          closedAt: issue.closedAt ? new Date(issue.closedAt) : null,
          author: issue.author,
          group: groupId,
        },
        $setOnInsert: { number: issue.number },
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await Issue.bulkWrite(operations);
  }
}

// Extracts unique contributors from commit authors
async function upsertContributors(
  groupId: string,
  commits: Awaited<ReturnType<typeof fetchCommits>>,
) {
  // Deduplicate by login or email - a person may have many commits
  const seen = new Map<string, (typeof commits)[0]>();
  for (const commit of commits) {
    const key = commit.author.login || commit.author.email;
    if (!key) continue;
    // Keep the most recent commit's author info (commits are newest-first)
    if (!seen.has(key)) {
      seen.set(key, commit);
    }
  }

  const operations = Array.from(seen.entries()).map(([key, commit]) => ({
    updateOne: {
      filter: { githubId: key, group: groupId },
      update: {
        $set: {
          name: commit.author.name,
          email: commit.author.email,
          group: groupId,
          lastSeen: new Date(commit.date),
        },
        $setOnInsert: { githubId: key },
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await Contributor.bulkWrite(operations);
  }
}

async function upsertSprintTasks(
  groupId: string,
  tasks: Awaited<ReturnType<typeof fetchProjectTasks>>,
) {
  // Sprint tasks from GitHub Projects are upserted by issueNumber + group.
  // Tasks without an issueNumber (draft issues) are matched by title + group
  const operations = tasks.map((task) => {
    const filter = task.issueNumber
      ? { issueNumber: task.issueNumber, group: groupId }
      : { title: task.title, group: groupId, issueNumber: null };

    return {
      updateOne: {
        filter,
        update: {
          $set: {
            title: task.title,
            status: task.status,
            assignees: task.assignees,
            issueNumber: task.issueNumber,
            group: groupId,
          },
        },
        upsert: true,
      },
    };
  });

  if (operations.length > 0) {
    await SprintTask.bulkWrite(operations);
  }
}

// Error handling - different errors get different statuses so the UI can show the right message

async function handleSyncError(
  groupId: string,
  error: unknown,
  accessToken: string,
) {
  if (error instanceof GitHubRateLimitError) {
    // Rate limited - mark it so we can retry later with backoff
    await Group.findByIdAndUpdate(groupId, {
      syncStatus: "rate_limited",
      syncError: error.message,
    });

    // Retry with exponential backoff (1s, 2s, 4s - 3 attempts max)
    await retryWithBackoff(groupId, accessToken, 3);
  } else if (error instanceof GitHubApiError) {
    // API error (repo not found, access denied, etc.) - don't retry
    await Group.findByIdAndUpdate(groupId, {
      syncStatus: "failed",
      syncError: error.message,
    });
  } else {
    // Unexpected error - log it and mark as failed
    const message =
      error instanceof Error ? error.message : "Unknown error during sync";
    await Group.findByIdAndUpdate(groupId, {
      syncStatus: "failed",
      syncError: message,
    });
  }
}

// When rate limited, we wait progressively longer between retries:
//   Attempt 1: wait 1 second
//   Attempt 2: wait 2 seconds
//   Attempt 3: wait 4 seconds
// If all retries fail, the group stays in "rate_limited" status.

async function retryWithBackoff(
  groupId: string,
  accessToken: string,
  maxRetries: number,
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Wait: 1s, 2s, 4s (doubles each time)
    const delay = 1000 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      // Try the full sync again
      await syncGroup(groupId, accessToken);
      return; // Success - stop retrying
    } catch (_error) {
      if (attempt === maxRetries - 1) {
        // Last attempt also failed - give up
        await Group.findByIdAndUpdate(groupId, {
          syncStatus: "rate_limited",
          syncError: "Sync failed after multiple retries due to rate limiting",
        });
      }
      // Otherwise, loop continues to next attempt
    }
  }
}

// Trigger sync (fire-and-forget) - Called from the group creation route

export function triggerSync(groupId: string, accessToken: string) {
  syncGroup(groupId, accessToken).catch((error) => {
    console.error(`Background sync failed for group ${groupId}:`, error);
  });
}
