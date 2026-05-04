import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import {
  calculateGithubMetricsLive,
  type GithubMetrics,
} from "@/app/lib/githubCalculator";
import { Commit, Group, Sprint, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { normalizeUserRef } from "@/app/lib/userRef";
import Dashboard from "@/components/dashboard/Dashboard";

type DashboardStatus = "ready" | "loading" | "empty" | "error";

type SprintForDashboard = {
  name: string;
  velocity: number;
  isCurrent: boolean;
};

// Read all sprints for the group from the DB and count commits in each sprint's
// date range to derive velocity. Sprints come from synced GitHub iterations
// (see syncService.upsertSprints). Returns [] when no iterations have been synced.
async function loadSprintsForDashboard(
  groupId: import("mongoose").Types.ObjectId,
): Promise<SprintForDashboard[]> {
  const sprints = await Sprint.find({ group: groupId })
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
    sprints.map(async (sprint) => {
      const velocity = await Commit.countDocuments({
        group: groupId,
        date: { $gte: sprint.startDate, $lte: sprint.endDate },
      });
      return {
        name: sprint.name,
        velocity,
        isCurrent: sprint.isCurrent,
      };
    }),
  );
}

// Fetch all data required to display the dashboard metrics
// Could take a while as it may involve multiple calls for githubCalculator
export default async function DashboardPage() {
  const session = await getServerSession(options);

  if (!session?.user) {
    redirect("/");
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
      <div className="lg:mt-7 lg:mx-6 lg:mb-7 mt-6 mx-5 mb-6 border-2 border-brand-border border-spacing-2 rounded-lg shadow-lg">
        <Dashboard
          status="empty"
          statusMessage="No group selected yet. Create or join a group to see dashboard metrics."
        />
      </div>
    );
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
    <div className="lg:mt-7 lg:mx-6 lg:mb-7 mt-6 mx-5 mb-6 overflow-hidden border-2 border-brand-border border-spacing-2 rounded-lg shadow-lg">
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
        iterationFieldConfigured={group.iterationFieldConfigured ?? null}
        nextSprintStart={
          nextSprintDoc ? nextSprintDoc.startDate.toISOString() : null
        }
      />
    </div>
  );
}
