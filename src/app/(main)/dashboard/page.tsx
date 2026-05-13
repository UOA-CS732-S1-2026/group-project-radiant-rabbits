import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { avatarUrlForLogin } from "@/app/lib/currentSprintService";
import type { GithubMetrics } from "@/app/lib/githubCalculator";
import { Group, Sprint, User } from "@/app/lib/models";
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

function getInitials(name: string): string {
  const tokens = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (tokens.length === 0) return "?";
  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("");
}

type ContributorRow = {
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

type HeaderBag = {
  get(name: string): string | null;
};

type DashboardApiContributor = {
  author: string;
  commitCount: number;
  prCount?: number;
  issueCount?: number;
};

type DashboardApiSprintVelocity = {
  sprintId: string;
  name: string;
  startDate: string;
  endDate: string;
  commitCount: number;
  issueCount?: number;
  isCurrent?: boolean;
};

type DashboardApiRepository = {
  owner: string | null;
  name: string | null;
  isConnected: boolean;
  syncStatus?: string | null;
  syncError?: string | null;
  validationError?: string | null;
};

type DashboardApiResponse = {
  contributors: DashboardApiContributor[];
  sprintVelocity: DashboardApiSprintVelocity[];
  githubMetrics?: GithubMetrics;
  repository?: DashboardApiRepository;
  totalCommits?: number;
  totalPullRequestsOpened?: number;
  totalIssuesClosed?: number;
};

const DASHBOARD_COLOURS = [
  "var(--color-brand-accent)",
  "var(--color-brand-in-progress)",
  "var(--color-brand-completed)",
  "var(--color-brand-todo)",
  "var(--color-brand-dark)",
  "var(--color-brand-accent)",
];

function buildRepoContributors(contributors: DashboardApiContributor[]) {
  return contributors
    .filter(
      (entry) =>
        (entry.commitCount ?? 0) +
          (entry.prCount ?? 0) +
          (entry.issueCount ?? 0) >
        0,
    )
    .sort(
      (a, b) =>
        (b.commitCount ?? 0) +
        (b.prCount ?? 0) +
        (b.issueCount ?? 0) -
        ((a.commitCount ?? 0) + (a.prCount ?? 0) + (a.issueCount ?? 0)),
    )
    .map((entry, index) => {
      const name = entry.author || "Unknown";
      return {
        name,
        initials: getInitials(name),
        avatarUrl: avatarUrlForLogin(name),
        commits: entry.commitCount ?? 0,
        prs: entry.prCount ?? 0,
        issues: entry.issueCount ?? 0,
        colour: DASHBOARD_COLOURS[index % DASHBOARD_COLOURS.length],
      };
    });
}

// Resolve the absolute origin so server-side fetch hits the same deployment.
function getDashboardBaseUrl(headerList: HeaderBag) {
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  if (!host) {
    return "http://localhost:3000";
  }
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
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

  const group = selectedGroup;

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

  if (!group.active) {
    redirect("/join-create-switch-group");
  }

  let hasAnySyncedSprint = false;
  if (group.repoOwner && group.repoName) {
    hasAnySyncedSprint = Boolean(
      await Sprint.findOne({ group: group._id }).select("_id").lean(),
    );
  }

  // If a background sync (e.g. triggered right after group creation) is already
  // running and there is no existing sprint data to show, return a loading state
  // that auto-refreshes every few seconds until the sync completes.
  if (
    group.syncStatus === "in_progress" &&
    group.repoOwner &&
    group.repoName &&
    accessToken &&
    !hasAnySyncedSprint
  ) {
    return (
      <Dashboard
        status="loading"
        statusMessage="Syncing your repository data for the first time — this usually takes a few seconds."
        groupId={group._id.toString()}
      />
    );
  }

  // Dashboard is the first page after group creation/switching, so opportunistic
  // sync here keeps GitHub iteration data fresh without requiring a manual click.
  if (
    group.repoOwner &&
    group.repoName &&
    accessToken &&
    group.syncStatus !== "in_progress"
  ) {
    const syncedRecently =
      group.lastSyncAt instanceof Date &&
      Date.now() - group.lastSyncAt.getTime() < 2 * 60 * 1000;

    if (!hasAnySyncedSprint || !syncedRecently) {
      void syncGroup(group._id.toString(), accessToken).catch((error) => {
        console.error("Dashboard entry sync failed:", error);
      });
    }
  }

  let status: DashboardStatus = "ready";
  let statusMessage: string | undefined;
  let repository: DashboardApiRepository | undefined;
  let metrics:
    | Omit<GithubMetrics, "commits" | "pullRequests" | "issues">
    | undefined;
  let repoContributorsData: Array<ContributorRow & { colour: string }> = [];
  let repoActivityTotals: RepoActivityTotals | undefined;
  let sprints: SprintForDashboard[] = [];
  let nextSprintStart: string | null = null;

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
      const headerList = await headers();
      const baseUrl = getDashboardBaseUrl(headerList);
      const cookie = headerList.get("cookie") ?? "";

      // Use the cached dashboard API (Redis-backed) to avoid live GitHub calls here.
      const response = await fetch(
        `${baseUrl}/api/groups/${group._id.toString()}/dashboard`,
        {
          headers: cookie ? { cookie } : undefined,
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error || "Failed to load dashboard data");
      }

      const payload = (await response.json()) as DashboardApiResponse;
      repository = payload.repository;

      if (repository?.isConnected === false) {
        status = "error";
        statusMessage =
          repository.validationError ??
          "No repository is connected to this group.";
      } else if (!payload.githubMetrics) {
        status = "error";
        statusMessage = "Dashboard metrics are not available right now.";
      } else {
        const apiMetrics = payload.githubMetrics;
        repoContributorsData = buildRepoContributors(payload.contributors);

        metrics = {
          totalCommits: apiMetrics.totalCommits,
          commitsLastSprint: apiMetrics.commitsLastSprint,
          totalPullRequests: apiMetrics.totalPullRequests,
          pullRequestsMergedLastSprint: apiMetrics.pullRequestsMergedLastSprint,
          totalIssuesClosed: apiMetrics.totalIssuesClosed,
          issuesClosedLastSprint: apiMetrics.issuesClosedLastSprint,
          activeContributors:
            repoContributorsData.length > 0
              ? repoContributorsData.length
              : apiMetrics.activeContributors,
          lastSprintStart: apiMetrics.lastSprintStart,
          lastSprintEnd: apiMetrics.lastSprintEnd,
        };

        repoActivityTotals = {
          commits: apiMetrics.totalCommits,
          prs: apiMetrics.totalPullRequests,
          issues: apiMetrics.totalIssuesClosed,
        };

        const now = new Date();
        const velocityItems = payload.sprintVelocity ?? [];

        sprints = velocityItems.map((sprint) => {
          const startDate = new Date(sprint.startDate);
          const endDate = new Date(sprint.endDate);
          const isCurrent =
            sprint.isCurrent ?? (startDate <= now && now <= endDate);
          const velocity =
            typeof sprint.issueCount === "number"
              ? sprint.issueCount
              : sprint.commitCount;

          return {
            name: sprint.name,
            velocity,
            isCurrent,
            startDate,
            endDate,
          };
        });

        if (sprints.length > 0 && !sprints.some((s) => s.isCurrent)) {
          const nextSprint = velocityItems
            .map((sprint) => new Date(sprint.startDate))
            .filter((date) => date > now)
            .sort((a, b) => a.getTime() - b.getTime())[0];

          nextSprintStart = nextSprint ? nextSprint.toISOString() : null;
        }
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      status = "error";
      statusMessage = error instanceof Error ? error.message : String(error);
    }
  }

  // Display the dashboard with the fetched metrics
  return (
    <Dashboard
      status={status}
      statusMessage={statusMessage}
      repository={
        repository ?? {
          owner: group.repoOwner,
          name: group.repoName,
          isConnected: Boolean(group.repoOwner && group.repoName),
          syncStatus: group.syncStatus,
          syncError: group.syncError,
          validationError:
            group.repoOwner && group.repoName
              ? null
              : "No repository is connected to this group.",
        }
      }
      metrics={metrics}
      sprints={sprints}
      repoContributors={repoContributorsData}
      repoActivityTotals={repoActivityTotals}
      iterationFieldConfigured={group.iterationFieldConfigured ?? null}
      nextSprintStart={nextSprintStart}
      groupId={group._id.toString()}
    />
  );
}
