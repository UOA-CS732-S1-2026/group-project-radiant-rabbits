import mongoose from "mongoose";
import { Commit, Issue, PullRequest, Sprint } from "@/app/lib/models";

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

  if (completedSprint?.startDate && completedSprint?.endDate) {
    return {
      start: new Date(completedSprint.startDate as Date),
      end: new Date(completedSprint.endDate as Date),
    };
  }

  const currentSprint = await Sprint.findOne({
    group: groupObjectId,
    isCurrent: true,
  })
    .sort({ startDate: -1 })
    .lean();

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

  const lengthDays =
    sprintLengthDays && sprintLengthDays > 0
      ? sprintLengthDays
      : FALLBACK_SPRINT_LENGTH_DAYS;
  const end = new Date();
  const start = new Date(end.getTime() - lengthDays * DAY_MS);

  return { start, end };
}

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
  ]);

  return {
    totalCommits,
    commitsLastSprint,
    totalPullRequests,
    pullRequestsMergedLastSprint,
    totalIssuesClosed,
    issuesClosedLastSprint,
    activeContributors: 0,
    lastSprintStart: start,
    lastSprintEnd: end,
  };
}
