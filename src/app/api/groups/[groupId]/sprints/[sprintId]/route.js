import { NextResponse } from "next/server";
import connectMongoDB from "@/app/lib/mongodbConnection";
import Sprint from "@/models/Sprint";
import {
  getGroupAndMembership,
  hasOverlappingSprint,
  requireUser,
} from "../helpers";

function parseDate(value) {
  if (value === undefined) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function GET(request, { params }) {
  try {
    await connectMongoDB();

    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const { user } = auth;

    const { groupId, sprintId } = params;

    const groupResult = await getGroupAndMembership(groupId, user._id);
    if (groupResult.notFound) return groupResult.notFound;

    const { group, isMember } = groupResult;

    if (!isMember) {
      return NextResponse.json(
        { message: "User is not a member of this group" },
        { status: 403 },
      );
    }

    const sprint = await Sprint.findOne({ _id: sprintId, group: group._id });

    if (!sprint) {
      return NextResponse.json(
        { message: "Sprint not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(sprint, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to get sprint" },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectMongoDB();

    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const { user } = auth;

    const { groupId, sprintId } = params;

    const groupResult = await getGroupAndMembership(groupId, user._id);
    if (groupResult.notFound) return groupResult.notFound;

    const { group, isMember } = groupResult;

    if (!isMember) {
      return NextResponse.json(
        { message: "User is not a member of this group" },
        { status: 403 },
      );
    }

    const sprint = await Sprint.findOne({ _id: sprintId, group: group._id });

    if (!sprint) {
      return NextResponse.json(
        { message: "Sprint not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { name, startDate, endDate } = body;

    const newStart =
      startDate === undefined ? sprint.startDate : parseDate(startDate);
    const newEnd = endDate === undefined ? sprint.endDate : parseDate(endDate);

    if (newStart === null || newEnd === null) {
      return NextResponse.json(
        { message: "startDate and endDate must be valid dates" },
        { status: 400 },
      );
    }

    if (!newStart || !newEnd) {
      return NextResponse.json(
        { message: "startDate and endDate are required" },
        { status: 400 },
      );
    }

    if (newEnd <= newStart) {
      return NextResponse.json(
        { message: "endDate must be later than startDate" },
        { status: 400 },
      );
    }

    const overlaps = await hasOverlappingSprint({
      groupId: group._id,
      startDate: newStart,
      endDate: newEnd,
      excludeSprintId: sprint._id,
    });

    if (overlaps) {
      return NextResponse.json(
        {
          message:
            "Sprint dates overlap with an existing sprint for this group",
        },
        { status: 400 },
      );
    }

    if (typeof name === "string") {
      sprint.name = name;
    }
    sprint.startDate = newStart;
    sprint.endDate = newEnd;

    await sprint.save();

    return NextResponse.json(sprint, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to update sprint" },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectMongoDB();

    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const { user } = auth;

    const { groupId, sprintId } = params;

    const groupResult = await getGroupAndMembership(groupId, user._id);
    if (groupResult.notFound) return groupResult.notFound;

    const { group, isMember } = groupResult;

    if (!isMember) {
      return NextResponse.json(
        { message: "User is not a member of this group" },
        { status: 403 },
      );
    }

    const sprint = await Sprint.findOneAndDelete({
      _id: sprintId,
      group: group._id,
    });

    if (!sprint) {
      return NextResponse.json(
        { message: "Sprint not found" },
        { status: 404 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to delete sprint" },
      { status: 500 },
    );
  }
}
