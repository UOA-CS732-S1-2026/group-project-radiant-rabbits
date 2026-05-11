import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group, Sprint } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import {
  aggregateSprintReviewData,
  buildSprintReviewPrompt,
  generateSprintReviewText,
  SprintReviewAiError,
} from "@/app/lib/sprintReviewService";
import { isUserInGroup } from "@/app/lib/userRef";

type SprintReviewRequestBody = {
  regenerate?: boolean;
};

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ groupId: string; sprintId: string }>;
  },
) {
  try {
    const session = await getServerSession(options);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { groupId, sprintId } = await params;

    let body: SprintReviewRequestBody = {};
    try {
      body = (await request.json()) as SprintReviewRequestBody;
    } catch {
      body = {};
    }

    const regenerate = body.regenerate === true;

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

    const sprint = await Sprint.findOne({ _id: sprintId, group: group._id });
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    if (sprint.aiReview?.text && !regenerate) {
      return NextResponse.json(
        {
          review: sprint.aiReview.text,
          cached: true,
          generatedAt: sprint.aiReview.generatedAt,
          model: sprint.aiReview.model,
          provider: sprint.aiReview.provider,
        },
        { status: 200 },
      );
    }

    const aggregatedData = await aggregateSprintReviewData(groupId, sprintId);
    const prompt = buildSprintReviewPrompt(aggregatedData);
    const generated = await generateSprintReviewText(prompt);

    sprint.aiReview = {
      text: generated.text,
      generatedAt: new Date(),
      model: generated.model,
      provider: generated.provider,
    };

    await sprint.save();

    return NextResponse.json(
      {
        review: generated.text,
        cached: false,
        generatedAt: sprint.aiReview.generatedAt,
        model: sprint.aiReview.model,
        provider: sprint.aiReview.provider,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error generating sprint review:", error);

    if (error instanceof SprintReviewAiError) {
      return NextResponse.json(
        { error: "Failed to generate sprint review" },
        { status: 502 },
      );
    }

    if (
      error instanceof Error &&
      error.message.includes("Invalid group or sprint")
    ) {
      return NextResponse.json(
        { error: "Invalid groupId or sprintId" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to generate sprint review" },
      { status: 500 },
    );
  }
}
