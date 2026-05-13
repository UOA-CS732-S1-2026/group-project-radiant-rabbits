import type mongoose from "mongoose";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import {
  Commit,
  Group,
  Issue,
  PullRequest,
  Sprint,
  User,
} from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import PastSprint from "@/components/past-sprint/PastSprint";
import type { PastSprintRowData } from "@/components/past-sprint/PastSprintRow";

// Past sprint rows are computed from event dates so historical cards stay
// stable even if later syncs add newer repository activity.
async function loadPastSprints(
  groupId: mongoose.Types.ObjectId,
): Promise<PastSprintRowData[]> {
  const sprints = await Sprint.find({
    group: groupId,
    status: "COMPLETED",
  })
    .sort({ endDate: -1 })
    .lean<
      Array<{
        _id: mongoose.Types.ObjectId;
        name: string;
        startDate: Date;
        endDate: Date;
        goal: string | null;
      }>
    >();

  return Promise.all(
    sprints.map(async (sprint) => {
      const [commits, issuesClosed, pullRequestsMerged] = await Promise.all([
        Commit.countDocuments({
          group: groupId,
          date: { $gte: sprint.startDate, $lte: sprint.endDate },
        }),
        Issue.countDocuments({
          group: groupId,
          state: "CLOSED",
          closedAt: { $gte: sprint.startDate, $lte: sprint.endDate },
        }),
        PullRequest.countDocuments({
          group: groupId,
          state: "MERGED",
          mergedAt: { $gte: sprint.startDate, $lte: sprint.endDate },
        }),
      ]);

      return {
        id: String(sprint._id),
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        summary: sprint.goal ?? "",
        commits,
        issuesClosed,
        pullRequestsMerged,
      };
    }),
  );
}

export default async function PastSprintsPage() {
  const session = await getServerSession(options);
  const isTestMode = process.env.TEST_MODE === "true";
  if (!session?.user) {
    redirect("/");
  }

  if (isTestMode) {
    return (
      <PastSprint
        status="ready"
        groupId="test-group"
        sprints={[
          {
            id: "test-sprint-1",
            name: "Sprint 1",
            startDate: new Date("2026-01-01"),
            endDate: new Date("2026-01-14"),
            summary: "Smoke test sprint summary",
            commits: 12,
            issuesClosed: 8,
            pullRequestsMerged: 5,
          },
        ]}
      />
    );
  }

  await connectMongoDB();

  const user = await User.findOne({ githubId: session.user.id }).select(
    "currentGroupId",
  );

  // Keep the page reachable for signed-in users without a group so the layout
  // can point them back to the group-selection flow.
  if (!user?.currentGroupId) {
    return (
      <PastSprint
        status="empty"
        statusMessage="No group selected. Create or join a group to see past sprints."
      />
    );
  }

  // A missing group can happen after archival/deletion, so show a recoverable
  // empty state instead of throwing from the server component.
  const group = await Group.findById(user.currentGroupId).select("_id");
  if (!group) {
    return (
      <PastSprint status="empty" statusMessage="Current group not found." />
    );
  }

  const pastSprints = await loadPastSprints(group._id);
  return (
    <PastSprint
      status="ready"
      sprints={pastSprints}
      groupId={group._id.toString()}
    />
  );
}
