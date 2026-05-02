import { log } from "node:console";
import type mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import {
  fetchCommits,
  fetchIssues,
  fetchPullRequests,
} from "@/app/lib/githubService";
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

const DAY_MS = 24 * 60 * 60 * 1000;

// Types for the response data structure
type ContributorActivity = {
  name: string;
  commitCount: number;
};

type SprintTaskRow = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  issueNumber: number | null;
  assignees: string[];
};

type SprintActivity = {
  date: Date;
  text: string;
  initials: string;
};

type ResolvedSprint = {
  id: string;
  number: number;
  name: string;
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
    .lean<
      Array<{
        _id: mongoose.Types.ObjectId;
        name: string;
        startDate: Date;
        endDate: Date;
        isCurrent: boolean;
      }>
    >();

  if (sprints.length === 0) return null;

  const currentIdx = sprints.findIndex((s) => s.isCurrent);
  const idx = currentIdx >= 0 ? currentIdx : sprints.length - 1;
  const doc = sprints[idx];
  const now = new Date();

  return {
    sprint: {
      id: String(doc._id),
      number: idx + 1,
      name: doc.name,
      startDate: doc.startDate,
      endDate: doc.endDate,
      status: computeStatus(now, doc.startDate, doc.endDate),
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
    assignees: t.assignees ?? [],
  }));

  const breakdown = {
    todo: tasks.filter((t) => t.status === "TODO").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    done: tasks.filter((t) => t.status === "DONE").length,
  };

  return { tasks, breakdown };
}

// Helper function to check if a given date value falls within the sprint period
function isInWindow(
  dateValue: string | Date | null | undefined,
  start: Date,
  end: Date,
) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start && date <= end;
}

// Fetch live data from GitHub API for the current sprint period
async function getLivePeriodActivity(
  accessToken: string,
  repoOwner: string,
  repoName: string,
  sprintStartDate: Date,
  sprintEndDate: Date,
): Promise<PeriodActivity> {
  const [commits, githubIssues, pullRequests] = await Promise.all([
    fetchCommits(accessToken, repoOwner, repoName),
    fetchIssues(accessToken, repoOwner, repoName),
    fetchPullRequests(accessToken, repoOwner, repoName),
  ]);

  const issuesInPeriodRaw = githubIssues
    .filter((issue) =>
      isInWindow(issue.createdAt, sprintStartDate, sprintEndDate),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const commitsInPeriod = commits.filter((commit) =>
    isInWindow(commit.date, sprintStartDate, sprintEndDate),
  );

  const contributorMap = new Map<string, number>();
  for (const commit of commitsInPeriod) {
    const key =
      commit.author.login ||
      commit.author.name ||
      commit.author.email ||
      "Unknown";
    contributorMap.set(key, (contributorMap.get(key) || 0) + 1);
  }

  const contributors = Array.from(contributorMap.entries())
    .map(([name, commitCount]) => ({ name, commitCount }))
    .sort((a, b) => b.commitCount - a.commitCount)
    .slice(0, 10);

  const pullRequestsOpened = pullRequests.filter((pr) =>
    isInWindow(pr.createdAt, sprintStartDate, sprintEndDate),
  ).length;

  const pullRequestsMerged = pullRequests.filter(
    (pr) =>
      pr.state === "MERGED" &&
      isInWindow(pr.mergedAt, sprintStartDate, sprintEndDate),
  ).length;

  const timelineFromCommits: SprintActivity[] = commitsInPeriod
    .slice(0, 6)
    .map((commit) => {
      const authorName =
        commit.author.login ||
        commit.author.name ||
        commit.author.email ||
        "Unknown";
      return {
        date: new Date(commit.date),
        text: `${authorName} pushed a commit`,
        initials: authorName.slice(0, 1).toUpperCase(),
      };
    });

  const timelineFromIssues: SprintActivity[] = issuesInPeriodRaw
    .slice(0, 6)
    .map((issue) => ({
      date: new Date(issue.createdAt),
      text:
        issue.state === "CLOSED"
          ? `Closed Issue #${issue.number}`
          : `Created Issue #${issue.number}`,
      initials: "I",
    }));

  const timelineFromPRs: SprintActivity[] = pullRequests
    .filter(
      (pr) =>
        pr.state === "MERGED" &&
        isInWindow(pr.mergedAt, sprintStartDate, sprintEndDate),
    )
    .slice(0, 6)
    .map((pr) => ({
      date: new Date(pr.mergedAt || pr.createdAt),
      text: `Merged PR #${pr.number}`,
      initials: (pr.author || "P").slice(0, 1).toUpperCase(),
    }));

  const timeline = [
    ...timelineFromPRs,
    ...timelineFromIssues,
    ...timelineFromCommits,
  ]
    .filter(
      (item) => item.date instanceof Date && !Number.isNaN(item.date.getTime()),
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  return {
    issuesCreated: issuesInPeriodRaw.length,
    commitsCount: commitsInPeriod.length,
    pullRequestsOpened,
    pullRequestsMerged,
    activeContributors: contributors.length,
    contributors,
    timeline,
  };
}

// Fallback function to fetch data from MongoDB if live GitHub API call fails or access token is not available
async function getPeriodActivityFromDb(
  groupId: unknown,
  sprintStartDate: Date,
  sprintEndDate: Date,
): Promise<PeriodActivity> {
  const [
    issuesCreated,
    commitsCount,
    prOpened,
    prMerged,
    topContributorsRaw,
    recentCommits,
    recentIssues,
    recentMergedPRs,
  ] = await Promise.all([
    Issue.countDocuments({
      group: groupId,
      createdAt: { $gte: sprintStartDate, $lte: sprintEndDate },
    }),
    Commit.countDocuments({
      group: groupId,
      date: { $gte: sprintStartDate, $lte: sprintEndDate },
    }),
    PullRequest.countDocuments({
      group: groupId,
      createdAt: { $gte: sprintStartDate, $lte: sprintEndDate },
    }),
    PullRequest.countDocuments({
      group: groupId,
      state: "MERGED",
      mergedAt: { $gte: sprintStartDate, $lte: sprintEndDate },
    }),
    Commit.aggregate<ContributorActivity>([
      {
        $match: {
          group: groupId,
          date: { $gte: sprintStartDate, $lte: sprintEndDate },
          "author.name": { $nin: [null, ""] },
        },
      },
      {
        $group: {
          _id: "$author.name",
          commitCount: { $sum: 1 },
        },
      },
      { $sort: { commitCount: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          name: "$_id",
          commitCount: 1,
        },
      },
    ]),
    Commit.find({
      group: groupId,
      date: { $gte: sprintStartDate, $lte: sprintEndDate },
    })
      .select("author message date")
      .sort({ date: -1 })
      .limit(6)
      .lean(),
    Issue.find({
      group: groupId,
      createdAt: { $gte: sprintStartDate, $lte: sprintEndDate },
    })
      .select("number state title createdAt")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    PullRequest.find({
      group: groupId,
      state: "MERGED",
      mergedAt: { $gte: sprintStartDate, $lte: sprintEndDate },
    })
      .select("number title mergedAt author")
      .sort({ mergedAt: -1 })
      .limit(6)
      .lean(),
  ]);

  const timelineFromCommits: SprintActivity[] = recentCommits.map((commit) => {
    const authorName = commit.author?.name?.trim() || "Unknown";
    return {
      date: commit.date,
      text: `${authorName} pushed a commit`,
      initials: authorName.slice(0, 1).toUpperCase(),
    };
  });

  const timelineFromIssues: SprintActivity[] = recentIssues.map((issue) => ({
    date: issue.createdAt,
    text:
      issue.state === "CLOSED"
        ? `Closed Issue #${issue.number}`
        : `Created Issue #${issue.number}`,
    initials: "I",
  }));

  const timelineFromPRs: SprintActivity[] = recentMergedPRs.map((pr) => ({
    date: pr.mergedAt,
    text: `Merged PR #${pr.number}`,
    initials: (pr.author || "P").slice(0, 1).toUpperCase(),
  }));

  const timeline = [
    ...timelineFromPRs,
    ...timelineFromIssues,
    ...timelineFromCommits,
  ]
    .filter(
      (item) => item.date instanceof Date && !Number.isNaN(item.date.getTime()),
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  return {
    issuesCreated,
    commitsCount,
    pullRequestsOpened: prOpened,
    pullRequestsMerged: prMerged,
    activeContributors: topContributorsRaw.length,
    contributors: topContributorsRaw,
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
      const message =
        group.iterationFieldConfigured === false
          ? "This repo's GitHub Project doesn't have an iteration field yet. Add one (https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-iterations) and assign tickets to it, then refresh."
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
          message:
            "No sprints found. Set up an iteration field on your GitHub Project, assign tickets to it, and refresh.",
        },
      };
    }

    const { sprint, sprintObjectId } = resolved;
    const sessionWithToken = session as { accessToken?: string };

    // Activity metrics are date-bucketed against the sprint window. Tasks come
    // from SprintTask docs linked to this sprint via the iteration map.
    const [periodActivity, taskData] = await Promise.all([
      (async () => {
        if (sessionWithToken.accessToken && group.repoOwner && group.repoName) {
          try {
            return await getLivePeriodActivity(
              sessionWithToken.accessToken,
              group.repoOwner,
              group.repoName,
              sprint.startDate,
              sprint.endDate,
            );
          } catch {
            return getPeriodActivityFromDb(
              group._id,
              sprint.startDate,
              sprint.endDate,
            );
          }
        }
        return getPeriodActivityFromDb(
          group._id,
          sprint.startDate,
          sprint.endDate,
        );
      })(),
      loadSprintTasks(group._id, sprintObjectId),
    ]);

    const now = new Date();

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
