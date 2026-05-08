import mongoose from "mongoose";
import {
  fetchCommits,
  fetchIssues,
  fetchPullRequests,
} from "@/app/lib/githubService";
import {
  Commit,
  Contributor,
  Issue,
  PullRequest,
  Sprint,
} from "@/app/lib/models";

// Constants for fallback dashboard calculation
const FALLBACK_SPRINT_LENGTH_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type GithubMetrics = {
  totalCommits: number;
  commitsLastSprint: number;
  totalPullRequests: number;
  pullRequestsMergedLastSprint: number;
  totalIssuesClosed: number;
  issuesClosedLastSprint: number;
  activeContributors: number;
  lastSprintStart: Date;
  lastSprintEnd: Date;
};

// Resolves the last sprint window based on completed sprints, current sprint, or fallback to a default length
async function resolveLastSprintWindow(
  groupObjectId: mongoose.Types.ObjectId,
  sprintLengthDays?: number | null,
): Promise<{ start: Date; end: Date }> {
  const completedSprint = await Sprint.findOne({
    group: groupObjectId,
    status: "COMPLETED",
  })
    .sort({ endDate: -1 })
    .lean();

  // If there's a completed sprint with valid dates, use that as the last sprint window
  if (completedSprint?.startDate && completedSprint?.endDate) {
    return {
      start: new Date(completedSprint.startDate as Date),
      end: new Date(completedSprint.endDate as Date),
    };
  }

  // If there is no completed sprint, check if there's a current sprint
  const currentSprint = await Sprint.findOne({
    group: groupObjectId,
    isCurrent: true,
  })
    .sort({ startDate: -1 })
    .lean();

  // If there's a current sprint with a valid start date, use it to calculate the last sprint window
  if (currentSprint?.startDate && currentSprint?.endDate) {
    const currentStart = new Date(currentSprint.startDate as Date);
    const currentEnd = new Date(currentSprint.endDate as Date);
    const sprintDurationMs = Math.max(
      currentEnd.getTime() - currentStart.getTime(),
      DAY_MS,
    );

    return {
      start: new Date(currentStart.getTime() - sprintDurationMs),
      end: currentStart,
    };
  }

  // If there are no completed or current sprints, fallback to using the provided sprint length or default length
  const lengthDays =
    sprintLengthDays && sprintLengthDays > 0
      ? sprintLengthDays
      : FALLBACK_SPRINT_LENGTH_DAYS;
  const end = new Date();
  const start = new Date(end.getTime() - lengthDays * DAY_MS);

  return { start, end };
}

// Live calculation of metrics for the dashboard
export async function calculateGithubMetricsLive(
  accessToken: string,
  groupId: string,
  owner: string,
  name: string,
  sprintLengthDays?: number | null,
): Promise<GithubMetrics> {
  const gid = new mongoose.Types.ObjectId(groupId);
  const { start, end } = await resolveLastSprintWindow(gid, sprintLengthDays);

  // Fetch all relevant data from GitHub from the repository
  const [commits, pullRequests, issues] = await Promise.all([
    fetchCommits(accessToken, owner, name),
    fetchPullRequests(accessToken, owner, name),
    fetchIssues(accessToken, owner, name),
  ]);

  // Calculate metrics based on the fetched data and the resolved sprint window and return
  const inWindow = (value: string | null | undefined) => {
    if (!value) return false;
    const date = new Date(value);
    return date >= start && date <= end;
  };

  const commitsLastSprint = commits.filter((commit) =>
    inWindow(commit.date),
  ).length;

  const pullRequestsMergedLastSprint = pullRequests.filter(
    (pr) => pr.state === "MERGED" && inWindow(pr.mergedAt),
  ).length;

  const closedIssues = issues.filter((issue) => issue.state === "CLOSED");
  const issuesClosedLastSprint = closedIssues.filter((issue) =>
    inWindow(issue.closedAt),
  ).length;

  const contributorKeys = new Set<string>();
  for (const commit of commits) {
    const key =
      commit.author.login || commit.author.email || commit.author.name;
    if (key) contributorKeys.add(key);
  }

  return {
    totalCommits: commits.length,
    commitsLastSprint,
    totalPullRequests: pullRequests.length,
    pullRequestsMergedLastSprint,
    totalIssuesClosed: closedIssues.length,
    issuesClosedLastSprint,
    activeContributors: contributorKeys.size,
    lastSprintStart: start,
    lastSprintEnd: end,
  };
}

// Database calculation of metrics for the dashboard
// Used as a fallback if live calculation fails and serves as an endpoint for the dashboard
export async function calculateGithubMetrics(
  groupId: string,
  sprintLengthDays?: number | null,
): Promise<GithubMetrics> {
  const gid = new mongoose.Types.ObjectId(groupId);
  const { start, end } = await resolveLastSprintWindow(gid, sprintLengthDays);

  const [
    totalCommits,
    commitsLastSprint,
    totalPullRequests,
    pullRequestsMergedLastSprint,
    totalIssuesClosed,
    issuesClosedLastSprint,
    contributorCount,
    distinctCommitAuthors,
  ] = await Promise.all([
    Commit.countDocuments({ group: gid }),
    Commit.countDocuments({ group: gid, date: { $gte: start, $lte: end } }),
    PullRequest.countDocuments({ group: gid }),
    PullRequest.countDocuments({
      group: gid,
      state: "MERGED",
      mergedAt: { $gte: start, $lte: end },
    }),
    Issue.countDocuments({ group: gid, state: "CLOSED" }),
    Issue.countDocuments({
      group: gid,
      state: "CLOSED",
      closedAt: { $gte: start, $lte: end },
    }),
    Contributor.countDocuments({ group: gid }),
    Commit.distinct("author.login", {
      group: gid,
      "author.login": { $nin: [null, ""] },
    }),
  ]);

  return {
    totalCommits,
    commitsLastSprint,
    totalPullRequests,
    pullRequestsMergedLastSprint,
    totalIssuesClosed,
    issuesClosedLastSprint,
    activeContributors:
      contributorCount > 0 ? contributorCount : distinctCommitAuthors.length,
    lastSprintStart: start,
    lastSprintEnd: end,
  };
}
