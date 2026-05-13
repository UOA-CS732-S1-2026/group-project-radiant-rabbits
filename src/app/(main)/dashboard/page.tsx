import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { avatarUrlForLogin } from "@/app/lib/currentSprintService";
import {
  calculateGithubMetricsLive,
  type GithubMetrics,
} from "@/app/lib/githubCalculator";
import type {
  CommitData,
  IssueData,
  PullRequestData,
} from "@/app/lib/githubService";
import { Group, Issue, Sprint, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { syncGroup } from "@/app/lib/syncService";
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

// Dashboard velocity is based on closed issues, not raw commits, because this
// view is meant to represent completed ticket work per sprint window.
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

function getInitials(name: string): string {
  const tokens = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (tokens.length === 0) return "?";
  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("");
}

type ContributorRow = {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  commits: number;
  prs: number;
  issues: number;
};

type RepoActivityTotals = {
  commits: number;
  prs: number;
  issues: number;
};

// Build per-contributor commit/PR/issue counts from the same live GitHub data
function buildRepositoryContributors(activity: {
  commits: CommitData[];
  pullRequests: PullRequestData[];
  issues: IssueData[];
}): {
  contributors: Array<ContributorRow & { colour: string }>;
  totals: RepoActivityTotals;
} {
  const canonicalByAlias = new Map<string, string>();
  for (const commit of activity.commits) {
    const login = commit.author?.login;
    if (!login) continue;
    const lowerLogin = login.trim().toLowerCase();
    if (!lowerLogin) continue;
    canonicalByAlias.set(lowerLogin, login);
    const name = commit.author?.name?.trim().toLowerCase();
    if (name) canonicalByAlias.set(name, login);
    const email = commit.author?.email?.trim().toLowerCase();
    if (email) canonicalByAlias.set(email, login);
  }

  const resolveCanonical = (
    alias: string | null | undefined,
  ): string | null => {
    if (!alias) return null;
    return canonicalByAlias.get(alias.trim().toLowerCase()) ?? null;
  };

  const contributorMap = new Map<string, ContributorRow>();

  const upsert = (
    key: string,
    displayName: string,
    login: string | null | undefined,
    bump: (row: ContributorRow) => void,
  ) => {
    const lookup = key.trim().toLowerCase();
    if (!lookup) return;
    const existing = contributorMap.get(lookup);
    if (existing) {
      bump(existing);
      if (!existing.avatarUrl) {
        existing.avatarUrl = avatarUrlForLogin(login);
      }
      if (displayName?.includes(" ") && !existing.name.includes(" ")) {
        existing.name = displayName;
        existing.initials = getInitials(displayName);
      }
      return;
    }
    const row: ContributorRow = {
      id: lookup,
      name: displayName,
      initials: getInitials(displayName),
      avatarUrl: avatarUrlForLogin(login),
      commits: 0,
      prs: 0,
      issues: 0,
    };
    bump(row);
    contributorMap.set(lookup, row);
  };

  for (const commit of activity.commits) {
    // Commits without a resolved GitHub login fall back to a name/email alias
    const canonicalLogin =
      commit.author?.login ??
      resolveCanonical(commit.author?.name) ??
      resolveCanonical(commit.author?.email);
    const display =
      commit.author?.name ||
      canonicalLogin ||
      commit.author?.email ||
      "Unknown";
    // Falling back to "Unknown" ensures commits with empty author metadata still get counted
    const key =
      canonicalLogin ||
      commit.author?.name ||
      commit.author?.email ||
      "Unknown";
    upsert(key, display, canonicalLogin, (row) => {
      row.commits += 1;
    });
  }

  for (const pr of activity.pullRequests) {
    const author = pr.author || "Unknown";
    const canonicalLogin = resolveCanonical(pr.author) ?? pr.author ?? null;
    upsert(canonicalLogin || author, author, canonicalLogin, (row) => {
      row.prs += 1;
    });
  }

  // Issues from GitHub already carry an author login, so attribute by author
  // rather than the never-populated Issue.assignees field.
  for (const issue of activity.issues) {
    const author = issue.author || "Unknown";
    const canonicalLogin =
      resolveCanonical(issue.author) ?? issue.author ?? null;
    upsert(canonicalLogin || author, author, canonicalLogin, (row) => {
      row.issues += 1;
    });
  }

  const colours = [
    "var(--color-brand-accent)",
    "var(--color-brand-in-progress)",
    "var(--color-brand-completed)",
    "var(--color-brand-todo)",
    "var(--color-brand-dark)",
    "var(--color-brand-accent)",
  ];

  // Show every contributor with activity so the bars in the breakdown sum to
  // the same totals as the chip labels / headline metric cards.
  const contributors = Array.from(contributorMap.values())
    .filter((c) => c.commits + c.prs + c.issues > 0)
    .sort(
      (a, b) => b.commits + b.prs + b.issues - (a.commits + a.prs + a.issues),
    )
    .map((row, index) => ({
      ...row,
      colour: colours[index % colours.length],
    }));

  return {
    contributors,
    totals: {
      commits: activity.commits.length,
      prs: activity.pullRequests.length,
      issues: activity.issues.length,
    },
  };
}

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
            id: "playwright-test-user",
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

  // Auto-select only when the user has no explicit current group; otherwise a
  // recent sync should not unexpectedly switch their working context.
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

  let group = selectedGroup;

  // Keep authenticated users in-app with a useful empty state instead of
  // redirecting them back to the landing page.
  if (!group) {
    return (
      <Dashboard
        status="empty"
        statusMessage="No group selected yet. Create or join a group to see dashboard metrics."
      />
    );
  }

  // If a background sync (e.g. triggered right after group creation) is already
  // running and there is no existing sprint data to show, return a loading state
  // that auto-refreshes every few seconds until the sync completes.
  if (
    group.syncStatus === "in_progress" &&
    group.repoOwner &&
    group.repoName &&
    accessToken
  ) {
    const hasAnySyncedSprint = Boolean(
      await Sprint.findOne({ group: group._id }).select("_id").lean(),
    );
    if (!hasAnySyncedSprint) {
      return (
        <Dashboard
          status="loading"
          statusMessage="Syncing your repository data for the first time — this usually takes a few seconds."
          groupId={group._id.toString()}
        />
      );
    }
    // Sprints already exist from a previous sync — fall through and render
    // the dashboard with current data while the background sync runs.
  }

  // Dashboard is the first page after group creation/switching, so opportunistic
  // sync here keeps GitHub iteration data fresh without requiring a manual click.
  if (
    group.repoOwner &&
    group.repoName &&
    accessToken &&
    group.syncStatus !== "in_progress"
  ) {
    const hasAnySyncedSprint = Boolean(
      await Sprint.findOne({ group: group._id }).select("_id").lean(),
    );
    const syncedRecently =
      group.lastSyncAt instanceof Date &&
      Date.now() - group.lastSyncAt.getTime() < 2 * 60 * 1000;

    if (!hasAnySyncedSprint || !syncedRecently) {
      try {
        await syncGroup(group._id.toString(), accessToken);
        const refreshedGroup = await Group.findById(group._id).lean();
        if (refreshedGroup) {
          group = refreshedGroup;
        }
      } catch (error) {
        console.error("Dashboard entry sync failed:", error);
      }
    }
  }

  if (!group.active) {
    redirect("/join-create-switch-group");
  }

  let status: DashboardStatus = "ready";
  let statusMessage: string | undefined;
  let githubMetrics:
    | Omit<GithubMetrics, "commits" | "pullRequests" | "issues">
    | undefined;
  let liveCommits: CommitData[] = [];
  let livePullRequests: PullRequestData[] = [];
  let liveIssues: IssueData[] = [];

  // Surface repository/session problems as dashboard errors because the user is
  // already authenticated and can recover by reconnecting/signing in again.
  if (!group.repoOwner || !group.repoName) {
    status = "error";
    statusMessage = "No repository is connected to this group.";
  } else if (!accessToken) {
    status = "error";
    statusMessage =
      "GitHub access token is missing from your session. Please sign in again.";
  } else {
    try {
      const result = await calculateGithubMetricsLive(
        accessToken,
        group._id.toString(),
        group.repoOwner,
        group.repoName,
        null,
      );
      const { commits, pullRequests, issues, ...metrics } = result;
      githubMetrics = metrics;
      liveCommits = commits ?? [];
      livePullRequests = pullRequests ?? [];
      liveIssues = issues ?? [];
    } catch (error) {
      console.error("Failed to calculate dashboard metrics:", error);
      status = "error";
      statusMessage = error instanceof Error ? error.message : String(error);
    }
  }

  // Sprint data is sourced from synced GitHub iterations
  const sprints = await loadSprintsForDashboard(group._id);

  const { contributors: repoContributorsData, totals: repoActivityTotals } =
    buildRepositoryContributors({
      commits: liveCommits,
      pullRequests: livePullRequests,
      issues: liveIssues,
    });

  // Use the deduped contributor row count for the headline card.
  if (githubMetrics) {
    githubMetrics = {
      ...githubMetrics,
      activeContributors: repoContributorsData.length,
    };
  }

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
      repoActivityTotals={repoActivityTotals}
      iterationFieldConfigured={group.iterationFieldConfigured ?? null}
      nextSprintStart={
        nextSprintDoc ? nextSprintDoc.startDate.toISOString() : null
      }
      groupId={group._id.toString()}
    />
  );
}
