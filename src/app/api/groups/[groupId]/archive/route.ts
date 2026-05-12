import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group, Sprint, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import {
  aggregateSprintReviewData,
  buildSprintReviewPrompt,
  generateSprintReviewText,
} from "@/app/lib/sprintReviewService";
import { isUserInGroup } from "@/app/lib/userRef";

function formatDateShort(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildFallbackReview(
  data: Awaited<ReturnType<typeof aggregateSprintReviewData>>,
) {
  const topContributors = data.topContributors.slice(0, 3);
  const contributorLines =
    topContributors.length > 0
      ? topContributors.map(
          (contributor) =>
            `- ${contributor.name}: ${contributor.commits} commits, ${contributor.pullRequestsMerged} PRs merged, ${contributor.tasksDone} tasks done`,
        )
      : ["- Contributor-level data is unavailable."];

  return [
    "Sprint Overview",
    `- ${data.sprint.name} (${formatDateShort(data.sprint.startDate)} - ${formatDateShort(data.sprint.endDate)}) was archived before normal sprint transition.`,
    data.sprint.goal?.trim()
      ? `- Sprint goal: ${data.sprint.goal.trim()}`
      : "- Sprint goal was not set.",
    `- Activity totals: ${data.metrics.commitCount} commits, ${data.metrics.issuesOpened} issues opened, ${data.metrics.pullRequestsOpened} PRs opened, ${data.metrics.pullRequestsMerged} PRs merged.`,
    "",
    "Key Contributions",
    ...contributorLines,
    "",
    "Team Activity",
    `- Task breakdown: ${data.metrics.tasksDone} done, ${data.metrics.tasksInProgress} in progress, ${data.metrics.tasksTodo} todo (${data.metrics.tasksTotal} total).`,
    `- Team members: ${data.members.length}.`,
    "",
    "Observations / Insights",
    "- This review was auto-generated during project archival.",
    "- If AI generation is unavailable, this summary falls back to repository metrics.",
  ].join("\n");
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    if (process.env.TEST_MODE === "true") {
      return NextResponse.json(
        { message: "Group archived successfully" },
        { status: 200 },
      );
    }

    const session = await getServerSession(options);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { groupId } = await params;
    if (!Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
    }

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

    if (!group.active) {
      return NextResponse.json(
        { message: "Group is already archived" },
        { status: 200 },
      );
    }

    const sprintToArchive = await Sprint.findOne({
      group: group._id,
      status: { $in: ["ACTIVE", "PLANNING"] },
    }).sort({ isCurrent: -1, endDate: -1, startDate: -1 });

    if (sprintToArchive) {
      if (!sprintToArchive.aiReview?.text?.trim()) {
        const aggregatedData = await aggregateSprintReviewData(
          group._id.toString(),
          sprintToArchive._id.toString(),
        );

        try {
          const prompt = buildSprintReviewPrompt(aggregatedData);
          const generated = await generateSprintReviewText(prompt);
          sprintToArchive.aiReview = {
            text: generated.text,
            generatedAt: new Date(),
            model: generated.model,
            provider: generated.provider,
          };
        } catch (reviewError) {
          console.error(
            "AI sprint review generation failed during archive; using fallback review.",
            reviewError,
          );
          sprintToArchive.aiReview = {
            text: buildFallbackReview(aggregatedData),
            generatedAt: new Date(),
            model: "fallback-template",
            provider: "openai",
          };
        }
      }

      sprintToArchive.status = "COMPLETED";
      sprintToArchive.isCurrent = false;
      await sprintToArchive.save();
    }

    group.active = false;
    await group.save();

    await User.updateMany(
      { currentGroupId: group._id },
      { $set: { currentGroupId: null } },
    );

    return NextResponse.json(
      { message: "Group archived successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error archiving group:", error);
    return NextResponse.json(
      { error: "Failed to archive group" },
      { status: 500 },
    );
  }
}
