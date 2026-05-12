import { log } from "node:console";
import type mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import {
  Commit,
  Group,
  Issue,
  PullRequest,
  Sprint,
  SprintTask,
  User,
} from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import type { GitHubIterationGuidanceVariant } from "@/lib/githubProjectDocs";

const DAY_MS = 24 * 60 * 60 * 1000;

// Types for the response data structure
type ContributorActivity = {
  name: string;
  commitCount: number;
  prCount: number;
  issueCount: number;
  // GitHub avatar URL when we know the login. Null when we only have a git
  // author name — the frontend falls back to initials.
  avatarUrl: string | null;
};

type SprintTaskRow = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  issueNumber: number | null;
  assignees: Array<{
    name: string;
    avatarUrl: string | null;
  }>;
  labels?: string[];
};

type SprintActivity = {
  date: Date;
  text: string;
  initials: string;
  // Same as ContributorActivity.avatarUrl — null when unknown.
  avatarUrl: string | null;
};

// Build a GitHub avatar URL from a login.
// github.com/<login>.png redirects to the user's current avatar.
export function avatarUrlForLogin(
  login: string | null | undefined,
): string | null {
  if (!login) return null;
  const trimmed = login.trim();
  if (!trimmed) return null;
  return `https://github.com/${trimmed}.png?size=64`;
}

type ResolvedSprint = {
  id: string;
  number: number;
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  status: "PLANNING" | "ACTIVE" | "COMPLETED";
  progress: {
    totalDays: number;
    elapsedDays: number;
    remainingDays: number;
    progressPercent: number;
  };
};

export type CurrentSprintMetrics = {
  issuesCreated: number;
  commitsCount: number;
  pullRequestsOpened: number;
  pullRequestsMerged: number;
  activeContributors: number;
  contributors: ContributorActivity[];
  timeline: SprintActivity[];
  // Tasks come from synced GitHub Project items linked to the sprint's iteration
  tasks: SprintTaskRow[];
  taskBreakdown: { todo: number; inProgress: number; done: number };
};

export type CurrentSprintBody = {
  group?: {
    id: string;
    name: string;
    syncStatus?: string;
    lastSyncAt?: Date | string | null;
  };
  sprint?: ResolvedSprint | null;
  selectionReason?: "current-flag" | "active" | "latest";
  metrics?: CurrentSprintMetrics;
  message?: string;
  /** When there is no synced sprint, matches dashboard sprint-velocity guidance. */
  iterationGuidanceVariant?: GitHubIterationGuidanceVariant;
  error?: string;
};

// Helper function to determine sprint status based on current date and sprint start/end dates
function computeStatus(now: Date, startDate: Date, endDate: Date) {
  if (now < startDate) return "PLANNING" as const;
  if (now > endDate) return "COMPLETED" as const;
  return "ACTIVE" as const;
}

// Helper function to compute sprint progress metrics
function computeProgress(now: Date, startDate: Date, endDate: Date) {
  const totalDays = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / DAY_MS),
  );
  const status = computeStatus(now, startDate, endDate);

  let elapsedDays = 0;
  if (status === "COMPLETED") {
    elapsedDays = totalDays;
  } else if (status === "ACTIVE") {
    elapsedDays = Math.min(
      totalDays,
      Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / DAY_MS)),
    );
  }

  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const progressPercent = Math.round((elapsedDays / totalDays) * 100);

  return {
    totalDays,
    elapsedDays,
    remainingDays,
    progressPercent,
  };
}

// Activity counts and contributor/timeline data for the sprint window.
// Tasks and breakdown come from a separate query (SprintTask via iteration link).
type PeriodActivity = Omit<CurrentSprintMetrics, "tasks" | "taskBreakdown">;

function mergeAssignedIssueCounts(
  contributors: ContributorActivity[],
  tasks: SprintTaskRow[],
): ContributorActivity[] {
  const contributorMap = new Map<string, ContributorActivity>();

  // Start with commit/PR contributors, then rebuild issue counts from ticket assignees so the list reflects who is working on the issue.
  for (const contributor of contributors) {
    contributorMap.set(contributor.name.trim().toLowerCase(), {
      ...contributor,
      issueCount: 0,
    });
  }

  // Count each assigned sprint task against every assignee on that task.
  // Keeps the contribution list aligned with who is actually working on
  // the ticket, not who originally opened the issue.
  for (const task of tasks) {
    for (const assignee of task.assignees) {
      const trimmed = assignee.name.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      const entry = contributorMap.get(key) ?? {
        name: trimmed,
        commitCount: 0,
        prCount: 0,
        issueCount: 0,
        avatarUrl: assignee.avatarUrl,
      };
      entry.issueCount += 1;
      if (!entry.avatarUrl) {
        entry.avatarUrl = assignee.avatarUrl;
      }
      contributorMap.set(key, entry);
    }
  }

  // Preserve the existing sort/slice behavior so the current sprint panel keeps
  // showing the top contributors in the same shape as before.
  return Array.from(contributorMap.values())
    .filter((entry) => entry.commitCount + entry.prCount + entry.issueCount > 0)
    .sort(
      (a, b) =>
        b.commitCount +
        b.prCount +
        b.issueCount -
        (a.commitCount + a.prCount + a.issueCount),
    )
    .slice(0, 10);
}

// Resolve the current sprint by reading synced Sprint docs.
// Prefers the one flagged isCurrent (set during sync if today falls in its window).
// Falls back to the most recently started sprint so the page still has something
// to show when we're between iterations or after the last one ended.
async function loadCurrentSprintAndPosition(
  groupId: mongoose.Types.ObjectId,
): Promise<{
  sprint: ResolvedSprint;
  sprintObjectId: mongoose.Types.ObjectId;
} | null> {
  const sprints = await Sprint.find({ group: groupId })
    .sort({ startDate: 1 })
    .lean<any[]>();

  if (sprints.length === 0) return null;

  const now = new Date();

  let idx = sprints.findIndex((s) => s.status === "ACTIVE");
  if (idx === -1) {
    const currentIdx = sprints.findIndex((s) => s.isCurrent);
    idx = currentIdx >= 0 ? currentIdx : sprints.length - 1;
  }

  // Auto-sprint completion
  if (idx !== -1 && idx < sprints.length - 1) {
    const currentDoc = sprints[idx];
    const expiryDate = new Date(currentDoc.endDate);

    if (now > expiryDate && currentDoc.status !== "COMPLETED") {
      await Sprint.updateOne(
        { _id: currentDoc._id },
        { $set: { status: "COMPLETED", isCurrent: false } },
      );

      const nextSprint = sprints[idx + 1];
      await Sprint.updateOne(
        { _id: nextSprint._id },
        { $set: { status: "ACTIVE", isCurrent: true } },
      );

      idx = idx + 1;
    }
  }

  if (idx === -1) {
    idx = sprints.findIndex((s) => now >= s.startDate && now <= s.endDate);
    if (idx === -1) idx = sprints.length - 1;
  }

  const doc = sprints[idx];

  return {
    sprint: {
      id: String(doc._id),
      number: idx + 1,
      name: doc.name,
      goal: doc.goal,
      startDate: doc.startDate,
      endDate: doc.endDate,
      status:
        doc.status ||
        (doc.isCurrent
          ? "ACTIVE"
          : computeStatus(now, doc.startDate, doc.endDate)),
      progress: computeProgress(now, doc.startDate, doc.endDate),
    },
    sprintObjectId: doc._id,
  };
}

// Load SprintTask docs assigned to this sprint via the synced iteration link.
// Tasks without a sprint link (i.e. backlog items not yet in any iteration) are excluded.
async function loadSprintTasks(
  groupId: mongoose.Types.ObjectId,
  sprintId: mongoose.Types.ObjectId,
): Promise<{
  tasks: SprintTaskRow[];
  breakdown: { todo: number; inProgress: number; done: number };
}> {
  const docs = await SprintTask.find({ group: groupId, sprint: sprintId })
    .select("title status assignees issueNumber")
    .lean<
      Array<{
        _id: mongoose.Types.ObjectId;
        title: string;
        status: "TODO" | "IN_PROGRESS" | "DONE";
        assignees: string[];
        issueNumber: number | null;
      }>
    >();

  const tasks: SprintTaskRow[] = docs.map((t) => ({
    id: String(t._id),
    title: t.title,
    status: t.status,
    issueNumber: t.issueNumber ?? null,
    assignees: (t.assignees ?? []).map((name) => ({
      name,
      avatarUrl: avatarUrlForLogin(name),
    })),
  }));

  const breakdown = {
    todo: tasks.filter((t) => t.status === "TODO").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    done: tasks.filter((t) => t.status === "DONE").length,
  };

  return { tasks, breakdown };
}

// Period metrics + timeline for the active sprint window. Reads only from
// MongoDB; sync is responsible for keeping the data fresh from GitHub.
async function getPeriodActivityFromDb(
  groupId: unknown,
  sprintStartDate: Date,
  sprintEndDate: Date,
): Promise<PeriodActivity> {
  const inWindow = { $gte: sprintStartDate, $lte: sprintEndDate };

  // Per-author bucket aggregations key on the same identifier across sources
  // so commit / PR / issue counts can merge cleanly downstream.
  const authorBucketProjection = { _id: 0, name: "$_id", count: 1 } as const;

  const [
    issuesCreated,
    commitsCount,
    prOpened,
    prMerged,
    commitAuthorBuckets,
    prAuthorBuckets,
    issueAuthorBuckets,
    recentCommits,
    issuesCreatedInWindow,
    issuesClosedInWindow,
    recentMergedPRs,
  ] = await Promise.all([
    Issue.countDocuments({ group: groupId, createdAt: inWindow }),
    Commit.countDocuments({ group: groupId, date: inWindow }),
    PullRequest.countDocuments({ group: groupId, createdAt: inWindow }),
    PullRequest.countDocuments({
      group: groupId,
      state: "MERGED",
      mergedAt: inWindow,
    }),
    Commit.aggregate<{ name: string; login: string | null; count: number }>([
      {
        $match: {
          group: groupId,
          date: inWindow,
          "author.login": { $nin: [null, ""] },
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$author.login", "$author.name"] },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, name: "$_id", login: "$_id", count: 1 } },
    ]),
    PullRequest.aggregate<{ name: string; count: number }>([
      {
        $match: {
          group: groupId,
          createdAt: inWindow,
          author: { $nin: [null, ""] },
        },
      },
      { $group: { _id: "$author", count: { $sum: 1 } } },
      { $project: authorBucketProjection },
    ]),
    Issue.aggregate<{ name: string; count: number }>([
      {
        $match: {
          group: groupId,
          createdAt: inWindow,
          author: { $nin: [null, ""] },
        },
      },
      { $group: { _id: "$author", count: { $sum: 1 } } },
      { $project: authorBucketProjection },
    ]),
    Commit.find({ group: groupId, date: inWindow })
      .select("author message date")
      .sort({ date: -1 })
      .limit(6)
      .lean(),
    // Issues created and issues closed in the window are queried separately
    // so a single issue can produce two timeline entries (one Created, one
    // Closed) at their respective timestamps. Querying only by createdAt
    // would drop the close event for issues opened before the sprint.
    Issue.find({ group: groupId, createdAt: inWindow })
      .select("number createdAt author")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    Issue.find({
      group: groupId,
      state: "CLOSED",
      closedAt: { ...inWindow, $ne: null },
    })
      .select("number closedAt author")
      .sort({ closedAt: -1 })
      .limit(6)
      .lean(),
    PullRequest.find({
      group: groupId,
      state: "MERGED",
      mergedAt: inWindow,
    })
      .select("number title mergedAt author")
      .sort({ mergedAt: -1 })
      .limit(6)
      .lean(),
  ]);

  const timelineFromCommits: SprintActivity[] = recentCommits.map((commit) => {
    const authorName =
      commit.author?.login?.trim() || commit.author?.name?.trim() || "Unknown";
    return {
      date: commit.date,
      text: `${authorName} pushed a commit`,
      initials: authorName.slice(0, 1).toUpperCase(),
      avatarUrl: avatarUrlForLogin(commit.author?.login),
    };
  });

  const timelineFromIssuesCreated: SprintActivity[] = issuesCreatedInWindow.map(
    (issue) => ({
      date: issue.createdAt,
      text: `${issue.author || "Unknown"} created Issue #${issue.number}`,
      initials: (issue.author || "U").slice(0, 1).toUpperCase(),
      avatarUrl: avatarUrlForLogin(issue.author),
    }),
  );

  const timelineFromIssuesClosed: SprintActivity[] = issuesClosedInWindow.map(
    (issue) => ({
      date: issue.closedAt,
      text: `${issue.author || "Unknown"} closed Issue #${issue.number}`,
      initials: (issue.author || "U").slice(0, 1).toUpperCase(),
      avatarUrl: avatarUrlForLogin(issue.author),
    }),
  );

  const timelineFromPRs: SprintActivity[] = recentMergedPRs.map((pr) => ({
    date: pr.mergedAt,
    text: `${pr.author || "Unknown"} merged PR #${pr.number}`,
    initials: (pr.author || "U").slice(0, 1).toUpperCase(),
    avatarUrl: avatarUrlForLogin(pr.author),
  }));

  const timeline = [
    ...timelineFromPRs,
    ...timelineFromIssuesClosed,
    ...timelineFromIssuesCreated,
    ...timelineFromCommits,
  ]
    .filter(
      (item) => item.date instanceof Date && !Number.isNaN(item.date.getTime()),
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 18);

  // Merge the three per-author buckets into one row using a case-insensitive
  // GitHub login key whenever available.
  type DbContributorEntry = {
    name: string;
    login: string | null;
    commitCount: number;
    prCount: number;
    issueCount: number;
  };
  const contributorMap = new Map<string, DbContributorEntry>();
  const upsert = (
    rawName: string,
    field: "commitCount" | "prCount" | "issueCount",
    count: number,
    login: string | null,
  ) => {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    const entry = contributorMap.get(key) ?? {
      name: trimmed,
      login: null,
      commitCount: 0,
      prCount: 0,
      issueCount: 0,
    };
    entry[field] = count;
    if (!entry.login && login) entry.login = login;
    contributorMap.set(key, entry);
  };
  // Commits carry author.login from sync; for PR/issue rows the bucket key is
  // already the GitHub login string.
  for (const b of commitAuthorBuckets)
    upsert(b.name, "commitCount", b.count, b.login ?? null);
  for (const b of prAuthorBuckets) upsert(b.name, "prCount", b.count, b.name);
  for (const b of issueAuthorBuckets)
    upsert(b.name, "issueCount", b.count, b.name);

  const contributors: ContributorActivity[] = Array.from(
    contributorMap.values(),
  )
    .map((entry) => ({
      name: entry.name,
      commitCount: entry.commitCount,
      prCount: entry.prCount,
      issueCount: entry.issueCount,
      avatarUrl: avatarUrlForLogin(entry.login),
    }))
    .sort(
      (a, b) =>
        b.commitCount +
        b.prCount +
        b.issueCount -
        (a.commitCount + a.prCount + a.issueCount),
    )
    .slice(0, 10);

  return {
    issuesCreated,
    commitsCount,
    pullRequestsOpened: prOpened,
    pullRequestsMerged: prMerged,
    activeContributors: contributors.length,
    contributors,
    timeline,
  };
}

// Categorise the sprint relative to today, mirroring the flag we set during sync.
function getSelectionReason(now: Date, sprintStart: Date, sprintEnd: Date) {
  if (now < sprintStart) return "current-flag" as const;
  if (now > sprintEnd) return "latest" as const;
  return "active" as const;
}

export async function getCurrentSprintData(): Promise<{
  status: number;
  body: CurrentSprintBody;
}> {
  try {
    const session = await getServerSession(options);

    if (!session?.user?.id) {
      return {
        status: 401,
        body: { error: "Authentication required" },
      };
    }

    await connectMongoDB();

    const user = await User.findOne({ githubId: session.user.id }).select(
      "currentGroupId",
    );

    if (!user?.currentGroupId) {
      return {
        status: 404,
        body: { error: "No current group selected" },
      };
    }

    const group = await Group.findById(user.currentGroupId).select(
      "name syncStatus lastSyncAt repoOwner repoName iterationFieldConfigured",
    );

    if (!group) {
      return {
        status: 404,
        body: { error: "Current group not found" },
      };
    }

    // Resolve the current sprint from synced GitHub iterations.
    // No sprints synced — branch the message on whether the iteration field
    // exists so the user gets an actionable hint.
    const resolved = await loadCurrentSprintAndPosition(group._id);
    if (!resolved) {
      const iterationGuidanceVariant: GitHubIterationGuidanceVariant =
        group.iterationFieldConfigured === false ? "no-field" : "no-iterations";
      const message =
        group.iterationFieldConfigured === false
          ? "This repo's GitHub Project doesn't have an iteration field yet. Add one and assign tickets to it, then refresh."
          : "No iterations created yet. Create one in your GitHub Project, assign tickets to it, and refresh.";
      return {
        status: 200,
        body: {
          group: {
            id: String(group._id),
            name: group.name,
            syncStatus: group.syncStatus,
            lastSyncAt: group.lastSyncAt,
          },
          sprint: null,
          message,
          iterationGuidanceVariant,
        },
      };
    }

    const { sprint, sprintObjectId } = resolved;

    // Period metrics scan Commit/Issue/PR by sprint window in parallel with
    // the SprintTask query that drives the task list and breakdown.
    const [periodActivity, taskData] = await Promise.all([
      getPeriodActivityFromDb(group._id, sprint.startDate, sprint.endDate),
      loadSprintTasks(group._id, sprintObjectId),
    ]);

    const now = new Date();
    const contributors = mergeAssignedIssueCounts(
      periodActivity.contributors,
      taskData.tasks,
    );

    return {
      status: 200,
      body: {
        group: {
          id: String(group._id),
          name: group.name,
          syncStatus: group.syncStatus,
          lastSyncAt: group.lastSyncAt,
        },
        sprint,
        selectionReason: getSelectionReason(
          now,
          sprint.startDate,
          sprint.endDate,
        ),
        metrics: {
          ...periodActivity,
          contributors,
          tasks: taskData.tasks,
          taskBreakdown: taskData.breakdown,
        },
      },
    };
  } catch (error) {
    log("Error fetching current sprint:", error);
    return {
      status: 500,
      body: { error: "Failed to fetch current sprint" },
    };
  }
}
