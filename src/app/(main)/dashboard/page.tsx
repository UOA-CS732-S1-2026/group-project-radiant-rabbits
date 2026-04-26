import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import {
  calculateGithubMetricsLive,
  type GithubMetrics,
} from "@/app/lib/githubCalculator";
import { Commit, Group, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { normalizeUserRef } from "@/app/lib/userRef";
import Dashboard from "@/components/main/Dashboard";

type DashboardStatus = "ready" | "loading" | "empty" | "error";

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

  const currentGroupId = currentGroup?._id?.toString();
  let selectedGroup = null;
  if (normalizedUserId) {
    const candidateGroups = await Group.find({
      $or: [{ createdBy: normalizedUserId }, { members: normalizedUserId }],
    })
      .sort({ lastSyncAt: -1, updatedAt: -1 })
      .lean();

    if (candidateGroups.length > 0) {
      const successfulCandidates = candidateGroups.filter(
        (candidate) => candidate.syncStatus === "success",
      );

      const candidateGroupsWithoutCurrent = candidateGroups.filter(
        (candidate) => candidate._id.toString() !== currentGroupId,
      );

      const successfulWithoutCurrent = successfulCandidates.filter(
        (candidate) => candidate._id.toString() !== currentGroupId,
      );

      const groupSearchOrder = [
        ...(currentGroup ? [currentGroup] : []),
        ...successfulWithoutCurrent,
        ...candidateGroupsWithoutCurrent,
      ];

      for (const candidate of groupSearchOrder) {
        const hasCommitData = await Commit.exists({ group: candidate._id });
        if (hasCommitData) {
          selectedGroup = candidate;
          break;
        }
      }

      selectedGroup ??=
        currentGroup ?? successfulCandidates[0] ?? candidateGroups[0];
    }
  }

  const group = selectedGroup;

  if (group && normalizedUserId && group._id.toString() !== currentGroupId) {
    await User.findByIdAndUpdate(normalizedUserId, {
      currentGroupId: group._id,
    });
  }

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

  // Convert sprint length from weeks to days
  const sprintLengthDays = group.sprintLengthWeeks
    ? group.sprintLengthWeeks * 7
    : null;

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
        sprintLengthDays,
      );
    } catch (error) {
      console.error("Failed to calculate dashboard metrics:", error);
      status = "error";
      statusMessage = error instanceof Error ? error.message : String(error);
    }
  }

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
        timeline={{
          projectStartDate: group.projectStartDate,
          projectEndDate: group.projectEndDate,
          sprintLengthDays,
        }}
      />
    </div>
  );
}
