import mongoose from "mongoose";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { calculateGithubMetrics } from "@/app/lib/githubCalculator";
import { Commit, Group, Issue, PullRequest, Sprint } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { isUserInGroup } from "@/app/lib/userRef";

const CACHE_TTL_SECONDS = 300;

export function buildCacheKey(
  groupId: string,
  sprintId?: string,
  startDate?: string,
  endDate?: string,
): string {
  // Include every filter that changes the aggregate so users never receive a
  // cached response for a different sprint or custom date range.
  if (sprintId) return `dashboard:${groupId}:sprint:${sprintId}`;
  if (startDate && endDate)
    return `dashboard:${groupId}:range:${startDate}:${endDate}`;
  return `dashboard:${groupId}:default`;
}

let redisClient: import("ioredis").Redis | null = null;

async function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (redisClient) return redisClient;
  try {
    // Redis is optional in local/dev deployments; dashboard data can still be
    // computed directly from Mongo if the cache layer is unavailable.
    const { default: Redis } = await import("ioredis");
    redisClient = new Redis(process.env.REDIS_URL);
    return redisClient;
  } catch {
    return null;
  }
}

async function getCached(key: string): Promise<string | null> {
  const redis = await getRedis();
  if (!redis) return null;
  try {
    const value = await redis.get(key);
    return value;
  } catch {
    // Cache failures should degrade to a fresh aggregate rather than fail the
    // dashboard request.
    return null;
  }
}

async function setCache(key: string, value: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, "EX", CACHE_TTL_SECONDS);
  } catch {
    // A missed write only affects performance until the next request.
  }
}

export async function resolveDateRange(
  groupId: string,
  sprintId?: string,
  startDate?: string,
  endDate?: string,
): Promise<{ start: Date; end: Date; sprint: unknown }> {
  const gid = new mongoose.Types.ObjectId(groupId);

  if (sprintId) {
    // Explicit sprint selection wins over custom dates so sprint drilldowns are
    // anchored to the stored iteration window.
    const sprint = await Sprint.findOne({
      _id: new mongoose.Types.ObjectId(sprintId),
      group: gid,
    });
    if (sprint) {
      return {
        start: sprint.startDate as Date,
        end: sprint.endDate as Date,
        sprint,
      };
    }
  }

  if (startDate && endDate) {
    return {
      start: new Date(startDate),
      end: new Date(endDate),
      sprint: null,
    };
  }

  const currentSprint = await Sprint.findOne({ group: gid, isCurrent: true });
  if (currentSprint) {
    return {
      start: currentSprint.startDate as Date,
      end: currentSprint.endDate as Date,
      sprint: currentSprint,
    };
  }

  const now = new Date();
  // Fresh groups may not have synced iterations yet; a 30-day window gives the
  // dashboard useful initial data without pretending a sprint exists.
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { start: thirtyDaysAgo, end: now, sprint: null };
}

export async function aggregateDashboard(
  groupId: string,
  start: Date,
  end: Date,
  sprintId?: string,
) {
  const gid = new mongoose.Types.ObjectId(groupId);

  // Prefer GitHub login over git author name so renamed local git identities do
  // not split one contributor into multiple dashboard rows.
  const contributorAgg = await Commit.aggregate([
    { $match: { group: gid, date: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $ifNull: ["$author.login", "$author.name"] },
        commitCount: { $sum: 1 },
      },
    },
    { $sort: { commitCount: -1 } },
    { $project: { _id: 0, author: "$_id", commitCount: 1 } },
  ]);

  const totalCommits = contributorAgg.reduce(
    (sum: number, c: { commitCount: number }) => sum + c.commitCount,
    0,
  );

  // All-time commits for this group, ignoring the date filter.
  // Used for the repo-wide "total commits" stat on the dashboard.
  const allTimeCommits = await Commit.countDocuments({ group: gid });

  // Closed issues are counted by close date because that is when the work
  // became completed during the selected window.
  const totalIssuesClosed = await Issue.countDocuments({
    group: gid,
    state: "CLOSED",
    closedAt: { $gte: start, $lte: end },
  });

  // PRs opened in range
  const totalPullRequestsOpened = await PullRequest.countDocuments({
    group: gid,
    createdAt: { $gte: start, $lte: end },
  });

  // PRs merged in range
  const totalPullRequestsMerged = await PullRequest.countDocuments({
    group: gid,
    state: "MERGED",
    mergedAt: { $gte: start, $lte: end },
  });

  // Sprint velocity
  const sprintFilter: Record<string, unknown> = { group: gid };
  if (sprintId) {
    sprintFilter._id = new mongoose.Types.ObjectId(sprintId);
  }

  const sprints = await Sprint.find(sprintFilter).sort({ startDate: 1 }).lean();

  const sprintVelocity = await Promise.all(
    sprints.map(async (sprint) => {
      const commitCount = await Commit.countDocuments({
        group: gid,
        date: {
          $gte: sprint.startDate as Date,
          $lte: sprint.endDate as Date,
        },
      });
      return {
        sprintId: sprint._id,
        name: sprint.name as string,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        commitCount,
      };
    }),
  );

  return {
    contributors: contributorAgg,
    totalCommits,
    allTimeCommits,
    totalIssuesClosed,
    totalPullRequestsOpened,
    totalPullRequestsMerged,
    sprintVelocity,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const session = await getServerSession(options);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { groupId } = await params;

    await connectMongoDB();

    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (!isUserInGroup(group.members, session.user.id)) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 },
      );
    }

    // Parse query params
    const url = request.nextUrl;
    const sprintId = url.searchParams.get("sprintId") ?? undefined;
    const startDate = url.searchParams.get("startDate") ?? undefined;
    const endDate = url.searchParams.get("endDate") ?? undefined;

    // Dashboard aggregates are read-heavy; caching keeps repeated navigation
    // from re-running the same Mongo aggregations within a short window.
    const cacheKey = buildCacheKey(groupId, sprintId, startDate, endDate);
    const cached = await getCached(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }

    // Resolve date range
    const range = await resolveDateRange(groupId, sprintId, startDate, endDate);

    // Aggregate
    const data = await aggregateDashboard(
      groupId,
      range.start,
      range.end,
      sprintId,
    );

    // Calculate GitHub metrics
    const githubMetrics = await calculateGithubMetrics(
      groupId,
      group.sprintLengthDays,
    );

    // Build repository info
    const repository = {
      owner: group.repoOwner,
      name: group.repoName,
      isConnected: Boolean(group.repoOwner && group.repoName),
      syncStatus: group.syncStatus,
      syncError: group.syncError,
      validationError:
        group.repoOwner && group.repoName
          ? null
          : "No repository is connected to this group.",
    };

    const payload = {
      ...data,
      githubMetrics,
      repository,
    };

    // Cache result
    await setCache(cacheKey, JSON.stringify(payload));

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 },
    );
  }
}
