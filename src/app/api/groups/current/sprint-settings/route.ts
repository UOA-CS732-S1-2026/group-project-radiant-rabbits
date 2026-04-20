import { log } from "node:console";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";

export async function GET() {
  try {
    const session = await getServerSession(options);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    await connectMongoDB();

    const user = await User.findOne({ githubId: session.user.id }).select(
      "currentGroupId",
    );

    if (!user?.currentGroupId) {
      return NextResponse.json(
        { error: "No current group selected" },
        { status: 404 },
      );
    }

    const group = await Group.findById(user.currentGroupId).select(
      "projectStartDate projectEndDate sprintLengthWeeks name repoOwner repoName",
    );

    if (!group) {
      return NextResponse.json(
        { error: "Current group not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        group: {
          id: group._id,
          name: group.name,
          repoOwner: group.repoOwner,
          repoName: group.repoName,
        },
        sprintSettings: {
          projectStartDate: group.projectStartDate,
          projectEndDate: group.projectEndDate,
          sprintLengthWeeks: group.sprintLengthWeeks ?? null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    log("Error fetching sprint settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch sprint settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(options);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { projectStartDate, projectEndDate, sprintLengthWeeks } =
      await request.json();

    const sprintLengthNumber = Number(sprintLengthWeeks);

    if (!projectStartDate || !projectEndDate) {
      return NextResponse.json(
        { error: "Project start date and end date are required" },
        { status: 400 },
      );
    }

    const startDate = new Date(projectStartDate);
    const endDate = new Date(projectEndDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid project start or end date" },
        { status: 400 },
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "Project end date must be after project start date" },
        { status: 400 },
      );
    }

    if (
      !sprintLengthWeeks || // catches "", null, undefined
      Number.isNaN(sprintLengthNumber) || // catches NaN
      !Number.isInteger(sprintLengthNumber) ||
      sprintLengthNumber < 1 ||
      sprintLengthNumber > 3
    ) {
      return NextResponse.json(
        { error: "Sprint length must be between 1 and 3 weeks" },
        { status: 400 },
      );
    }

    await connectMongoDB();

    const user = await User.findOne({ githubId: session.user.id }).select(
      "currentGroupId",
    );

    if (!user?.currentGroupId) {
      return NextResponse.json(
        { error: "No current group selected" },
        { status: 404 },
      );
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      user.currentGroupId,
      {
        projectStartDate: startDate,
        projectEndDate: endDate,
        sprintLengthWeeks: sprintLengthNumber,
      },
      { new: true },
    ).select(
      "projectStartDate projectEndDate sprintLengthWeeks name repoOwner repoName",
    );

    if (!updatedGroup) {
      return NextResponse.json(
        { error: "Current group not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message: "Sprint settings updated successfully",
        group: {
          id: updatedGroup._id,
          name: updatedGroup.name,
          repoOwner: updatedGroup.repoOwner,
          repoName: updatedGroup.repoName,
        },
        sprintSettings: {
          projectStartDate: updatedGroup.projectStartDate,
          projectEndDate: updatedGroup.projectEndDate,
          sprintLengthWeeks: updatedGroup.sprintLengthWeeks ?? null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    log("Error updating sprint settings:", error);
    return NextResponse.json(
      { error: "Failed to update sprint settings" },
      { status: 500 },
    );
  }
}
