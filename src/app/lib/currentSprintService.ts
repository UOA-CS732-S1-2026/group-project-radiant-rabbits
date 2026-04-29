import { log } from "node:console";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import {
  fetchCommits,
  fetchIssues,
  fetchPullRequests,
} from "@/app/lib/githubService";
import { Commit, Group, Issue, PullRequest, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";

const DAY_MS = 24 * 60 * 60 * 1000;

// Types for the response data structure
type ContributorActivity = {
  name: string;
  commitCount: number;
};

type SprintIssue = {
  id: string;
  number: number;
  title: string;
  status: "Open" | "Closed";
  createdAt: Date;
};

type SprintActivity = {
  date: Date;
  text: string;
  initials: string;
};

type ComputedSprint = {
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
  issues: SprintIssue[];
  timeline: SprintActivity[];
};

export type CurrentSprintBody = {
  group?: {
    id: string;
    name: string;
    syncStatus?: string;
    lastSyncAt?: Date | string | null;
  };
  sprint?: ComputedSprint | null;
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

// Compute the current sprint based on project start/end dates, sprint length, and current date
function computeCurrentSprint(
  now: Date,
  projectStartDate: Date,
  projectEndDate: Date,
  sprintLengthWeeks: number,
): ComputedSprint {
  const inclusiveProjectEndDate = new Date(projectEndDate);
  inclusiveProjectEndDate.setUTCHours(23, 59, 59, 999);

  const sprintLengthDays = sprintLengthWeeks * 7;
  const totalProjectDays = Math.max(
    1,
    Math.ceil(
      (inclusiveProjectEndDate.getTime() - projectStartDate.getTime()) / DAY_MS,
    ),
  );
  const totalSprints = Math.max(
    1,
    Math.ceil(totalProjectDays / sprintLengthDays),
  );

  let sprintNumber = 1;
  if (now > inclusiveProjectEndDate) {
    sprintNumber = totalSprints;
  } else if (now >= projectStartDate) {
    const elapsedProjectDays = Math.floor(
      (now.getTime() - projectStartDate.getTime()) / DAY_MS,
    );
    sprintNumber = Math.min(
      totalSprints,
      Math.floor(elapsedProjectDays / sprintLengthDays) + 1,
    );
  }

  const sprintStartDate = new Date(
    projectStartDate.getTime() + (sprintNumber - 1) * sprintLengthDays * DAY_MS,
  );
  const sprintEndExclusive = new Date(
    sprintStartDate.getTime() + sprintLengthDays * DAY_MS,
  );
  const sprintEndDate = new Date(
    Math.min(
      sprintEndExclusive.getTime() - 1,
      inclusiveProjectEndDate.getTime(),
    ),
  );

  return {
    id: `computed-sprint-${sprintNumber}`,
    number: sprintNumber,
    name: `Sprint ${sprintNumber}`,
    startDate: sprintStartDate,
    endDate: sprintEndDate,
    status: computeStatus(now, sprintStartDate, sprintEndDate),
    progress: computeProgress(now, sprintStartDate, sprintEndDate),
  };
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
): Promise<CurrentSprintMetrics> {
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

  const sprintIssues: SprintIssue[] = issuesInPeriodRaw.map((issue) => ({
    id: `${issue.number}`,
    number: issue.number,
    title: issue.title,
    status: issue.state === "CLOSED" ? "Closed" : "Open",
    createdAt: new Date(issue.createdAt),
  }));

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
    issues: sprintIssues,
    timeline,
  };
}

// Fallback function to fetch data from MongoDB if live GitHub API call fails or access token is not available
async function getPeriodActivityFromDb(
  groupId: unknown,
  sprintStartDate: Date,
  sprintEndDate: Date,
): Promise<CurrentSprintMetrics> {
  const [
    issuesCreated,
    commitsCount,
    prOpened,
    prMerged,
    topContributorsRaw,
    issuesInPeriod,
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
    Issue.find({
      group: groupId,
      createdAt: { $gte: sprintStartDate, $lte: sprintEndDate },
    })
      .select("_id number title state createdAt")
      .sort({ createdAt: -1 })
      .lean(),
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

  const issues: SprintIssue[] = issuesInPeriod.map((issue) => ({
    id: String(issue._id),
    number: issue.number,
    title: issue.title,
    status: issue.state === "CLOSED" ? "Closed" : "Open",
    createdAt: issue.createdAt,
  }));

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
    issues,
    timeline,
  };
}

// Helper function to determine why a particular sprint was selected (current-flag, active, or latest)
function getSelectionReason(
  now: Date,
  projectStartDate: Date,
  projectEndDate: Date,
) {
  if (now < projectStartDate) return "current-flag" as const;
  if (now > projectEndDate) return "latest" as const;
  return "active" as const;
}

// Helper function to validate that a value is a valid Date object
function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
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
      "name projectStartDate projectEndDate sprintLengthWeeks syncStatus lastSyncAt repoOwner repoName",
    );

    if (!group) {
      return {
        status: 404,
        body: { error: "Current group not found" },
      };
    }

    if (
      !isValidDate(group.projectStartDate) ||
      !isValidDate(group.projectEndDate) ||
      !group.sprintLengthWeeks ||
      !Number.isInteger(group.sprintLengthWeeks) ||
      group.sprintLengthWeeks < 1
    ) {
      return {
        status: 200,
        body: {
          group: {
            id: String(group._id),
            name: group.name,
          },
          sprint: null,
          message:
            "Sprint settings are incomplete. Please set project dates and sprint length.",
        },
      };
    }

    if (group.projectEndDate <= group.projectStartDate) {
      return {
        status: 200,
        body: {
          group: {
            id: String(group._id),
            name: group.name,
          },
          sprint: null,
          message: "Project end date must be after project start date.",
        },
      };
    }

    const now = new Date();
    const computedSprint = computeCurrentSprint(
      now,
      group.projectStartDate,
      group.projectEndDate,
      group.sprintLengthWeeks,
    );

    const sessionWithToken = session as { accessToken?: string };
    let periodActivity: CurrentSprintMetrics;
    if (sessionWithToken.accessToken && group.repoOwner && group.repoName) {
      try {
        periodActivity = await getLivePeriodActivity(
          sessionWithToken.accessToken,
          group.repoOwner,
          group.repoName,
          computedSprint.startDate,
          computedSprint.endDate,
        );
      } catch {
        periodActivity = await getPeriodActivityFromDb(
          group._id,
          computedSprint.startDate,
          computedSprint.endDate,
        );
      }
    } else {
      periodActivity = await getPeriodActivityFromDb(
        group._id,
        computedSprint.startDate,
        computedSprint.endDate,
      );
    }

    return {
      status: 200,
      body: {
        group: {
          id: String(group._id),
          name: group.name,
          syncStatus: group.syncStatus,
          lastSyncAt: group.lastSyncAt,
        },
        sprint: computedSprint,
        selectionReason: getSelectionReason(
          now,
          group.projectStartDate,
          group.projectEndDate,
        ),
        metrics: periodActivity,
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
