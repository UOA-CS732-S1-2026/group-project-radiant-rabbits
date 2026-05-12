import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { avatarUrlForLogin } from "@/app/lib/currentSprintService";
import {
  calculateGithubMetricsLive,
  type GithubMetrics,
} from "@/app/lib/githubCalculator";
import {
  Commit,
  Group,
  Issue,
  PullRequest,
  Sprint,
  User,
} from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { normalizeUserRef } from "@/app/lib/userRef";
import Dashboard from "@/components/dashboard/Dashboard";

type DashboardStatus = "ready" | "loading" | "empty" | "error";

type SprintForDashboard = {
  name: string;
  velocity: number;
  isCurrent: boolean;
  startDate: Date;
  endDate: Date;
};

// Read all sprints for the group from the DB and count issues closed in each
// sprint's date range. Sprints come from synced GitHub iterations
// (see syncService.upsertSprints). Returns [] when no iterations have been synced.
async function loadSprintsForDashboard(
  groupId: import("mongoose").Types.ObjectId,
): Promise<SprintForDashboard[]> {
  const sprints = await Sprint.find({
    group: groupId,
    startDate: { $lte: new Date() },
  })
    .sort({ startDate: 1 })
    .lean<
      Array<{
        name: string;
        startDate: Date;
        endDate: Date;
        isCurrent: boolean;
      }>
    >();

  if (sprints.length === 0) return [];

  return Promise.all(
    sprints.map(async (sprintData) => {
      const velocity = await Issue.countDocuments({
        group: groupId,
        state: "CLOSED",
        closedAt: { $gte: sprintData.startDate, $lte: sprintData.endDate },
      });
      return {
        name: sprintData.name,
        velocity,
        isCurrent: sprintData.isCurrent,
        startDate: sprintData.startDate,
        endDate: sprintData.endDate,
      };
    }),
  );
}

// Helper to build initials from a name
function getInitials(name: string): string {
  const tokens = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (tokens.length === 0) return "?";
  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("");
}

// Load the contributors with their commits, PRs, and closed issue counts
async function loadRepositoryContributors(
  groupId: import("mongoose").Types.ObjectId,
): Promise<
  Array<{
    name: string;
    initials: string;
    avatarUrl: string | null;
    commits: number;
    prs: number;
    issues: number;
    colour: string;
  }>
> {
  // Get all commits with author info
  const commits = await Commit.find({ group: groupId })
    .select("author")
    .lean<
      Array<{ author: { name?: string; email?: string; login?: string } }>
    >();

  // Get all PRs with author info
  const prs = await PullRequest.find({ group: groupId })
    .select("author")
    .lean<Array<{ author: string }>>();

  // Get all closed issues with assigned person info
  const issues = await Issue.find({
    group: groupId,
    state: "CLOSED",
  })
    .select("assignees")
    .lean<Array<{ assignees: import("mongoose").Types.ObjectId[] }>>();

  // Bulk load all users referenced by issue assignees
  const assigneeIds = new Set<string>();
  for (const issue of issues) {
    if (issue.assignees) {
      for (const assigneeId of issue.assignees) {
        assigneeIds.add(String(assigneeId));
      }
    }
  }

  const userMap = new Map(
    (
      await User.find({ _id: { $in: Array.from(assigneeIds) } })
        .select("_id name login avatarUrl")
        .lean<
          Array<{
            _id: string;
            name?: string;
            login?: string;
            avatarUrl?: string | null;
          }>
        >()
    ).map((u) => [String(u._id), u]),
  );

  const contributorMap = new Map<
    string,
    {
      name: string;
      initials: string;
      avatarUrl: string | null;
      commits: number;
      prs: number;
      issues: number;
    }
  >();

  // Count commits by author
  for (const commit of commits) {
    const author = commit.author?.name || commit.author?.login || "Unknown";
    if (!author) continue;

    const key = author.trim().toLowerCase();
    const existing = contributorMap.get(key);

    if (existing) {
      existing.commits += 1;
      if (!existing.avatarUrl) {
        existing.avatarUrl = avatarUrlForLogin(commit.author?.login);
      }
    } else {
      contributorMap.set(key, {
        name: author,
        initials: getInitials(author),
        avatarUrl: avatarUrlForLogin(commit.author?.login),
        commits: 1,
        prs: 0,
        issues: 0,
      });
    }
  }

  // Count PRs by author
  for (const pr of prs) {
    const author = pr.author || "Unknown";
    if (!author) continue;

    const key = author.trim().toLowerCase();
    const existing = contributorMap.get(key);

    if (existing) {
      existing.prs += 1;
      if (!existing.avatarUrl) {
        existing.avatarUrl = avatarUrlForLogin(pr.author);
      }
    } else {
      contributorMap.set(key, {
        name: author,
        initials: getInitials(author),
        avatarUrl: avatarUrlForLogin(pr.author),
        commits: 0,
        prs: 1,
        issues: 0,
      });
    }
  }

  // Count issues by assignee
  for (const issue of issues) {
    if (!issue.assignees || issue.assignees.length === 0) continue;

    for (const assigneeId of issue.assignees) {
      const user = userMap.get(String(assigneeId));
      if (!user) continue;

      const name = user.name || user.login || "Unknown";
      const key = name.trim().toLowerCase();
      const userAvatar = user.avatarUrl || avatarUrlForLogin(user.login);
      const existing = contributorMap.get(key);

      if (existing) {
        existing.issues += 1;
        if (!existing.avatarUrl) {
          existing.avatarUrl = userAvatar;
        }
      } else {
        contributorMap.set(key, {
          name,
          initials: getInitials(name),
          avatarUrl: userAvatar,
          commits: 0,
          prs: 0,
          issues: 1,
        });
      }
    }
  }

  // Convert to array, sort by total contribution, take top 6
  const colours = [
    "var(--color-brand-accent)",
    "var(--color-brand-in-progress)",
    "var(--color-brand-completed)",
    "var(--color-brand-todo)",
    "var(--color-brand-dark)",
    "var(--color-brand-accent)",
  ];

  // Convert to array, sort by total contributions and take top 6
  return Array.from(contributorMap.values())
    .filter((c) => c.commits + c.prs + c.issues > 0)
    .sort(
      (a, b) => b.commits + b.prs + b.issues - (a.commits + a.prs + a.issues),
    )
    .slice(0, 6)
    .map((row, index) => ({
      ...row,
      colour: colours[index % colours.length],
    }));
}

// Fetch all data required to display the dashboard metrics
// Could take a while as it may involve multiple calls for githubCalculator
export default async function DashboardPage() {
  const session = await getServerSession(options);
  const isTestMode = process.env.TEST_MODE === "true";

  if (!session?.user) {
    redirect("/");
  }

  if (isTestMode) {
    return (
      <Dashboard
        status="ready"
        groupId="test-group"
        metrics={{
          totalCommits: 24,
          commitsLastSprint: 8,
          totalPullRequests: 10,
          pullRequestsMergedLastSprint: 4,
          totalIssuesClosed: 18,
          issuesClosedLastSprint: 6,
          activeContributors: 3,
        }}
        sprints={[
          {
            name: "Sprint 1",
            velocity: 6,
            isCurrent: false,
          },
        ]}
        repoContributors={[
          {
            name: "Playwright Test User",
            initials: "PT",
            avatarUrl: null,
            commits: 8,
            prs: 4,
            issues: 6,
            colour: "var(--color-brand-accent)",
          },
        ]}
        statusMessage="Test mode is enabled."
      />
    );
  }

  const accessToken = (session as { accessToken?: string }).accessToken;

  await connectMongoDB();

  const normalizedUserId = normalizeUserRef(session.user.id);
  const user = normalizedUserId
    ? await User.findById(normalizedUserId).lean()
    : null;

  const currentGroup = user?.currentGroupId
    ? await Group.findById(user.currentGroupId).lean()
    : null;

  let selectedGroup = currentGroup;

  // Only run the fallback when the user hasn't picked a group yet.
  // Don't override an explicit selection.
  if (!selectedGroup && normalizedUserId) {
    const candidateGroups = await Group.find({
      $or: [{ createdBy: normalizedUserId }, { members: normalizedUserId }],
      active: true,
    })
      .sort({ lastSyncAt: -1, updatedAt: -1 })
      .lean();

    selectedGroup =
      candidateGroups.find((candidate) => candidate.syncStatus === "success") ??
      candidateGroups[0] ??
      null;

    if (selectedGroup) {
      await User.findByIdAndUpdate(normalizedUserId, {
        currentGroupId: selectedGroup._id,
      });
    }
  }

  const group = selectedGroup;

  // If user is not part of any group, show error message
  if (!group) {
    return (
      <Dashboard
        status="empty"
        statusMessage="No group selected yet. Create or join a group to see dashboard metrics."
      />
    );
  }

  if (!group.active) {
    redirect("/join-create-switch-group");
  }

  let status: DashboardStatus = "ready";
  let statusMessage: string | undefined;
  let githubMetrics: GithubMetrics | undefined;

  // Validate that the group actually has a repository
  if (!group.repoOwner || !group.repoName) {
    status = "error";
    statusMessage = "No repository is connected to this group.";
  } else if (!accessToken) {
    status = "error";
    statusMessage =
      "GitHub access token is missing from your session. Please sign in again.";
  } else {
    try {
      githubMetrics = await calculateGithubMetricsLive(
        accessToken,
        group._id.toString(),
        group.repoOwner,
        group.repoName,
        null,
      );
    } catch (error) {
      console.error("Failed to calculate dashboard metrics:", error);
      status = "error";
      statusMessage = error instanceof Error ? error.message : String(error);
    }
  }

  // Sprint data is sourced from synced GitHub iterations — empty array when
  // none have been synced yet. The Dashboard component handles the empty state.
  const sprints = await loadSprintsForDashboard(group._id);

  // Load repository contributors with aggregated contribution counts
  const repoContributorsData = await loadRepositoryContributors(group._id);

  // Find the next future sprint so we can show "next iteration starts on X"
  // when no iteration covers today.
  const nextSprintDoc =
    sprints.length > 0 && !sprints.some((s) => s.isCurrent)
      ? await Sprint.findOne({
          group: group._id,
          startDate: { $gt: new Date() },
        })
          .sort({ startDate: 1 })
          .select("startDate")
          .lean<{ startDate: Date }>()
      : null;

  // Display the dashboard with the fetched metrics
  return (
    <Dashboard
      status={status}
      statusMessage={statusMessage}
      repository={{
        owner: group.repoOwner,
        name: group.repoName,
        isConnected: Boolean(group.repoOwner && group.repoName),
        syncStatus: group.syncStatus,
        syncError: group.syncError,
        validationError:
          group.repoOwner && group.repoName
            ? null
            : "No repository is connected to this group.",
      }}
      metrics={githubMetrics}
      sprints={sprints}
      repoContributors={repoContributorsData}
      iterationFieldConfigured={group.iterationFieldConfigured ?? null}
      nextSprintStart={
        nextSprintDoc ? nextSprintDoc.startDate.toISOString() : null
      }
      groupId={group._id.toString()}
    />
  );
}
