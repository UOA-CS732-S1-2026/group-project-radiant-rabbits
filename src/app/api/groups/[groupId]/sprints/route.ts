import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group, Sprint } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { isUserInGroup } from "@/app/lib/userRef";

// POST /api/groups/:groupId/sprints
// Creates a new sprint for the given group.

export async function POST(
  request: Request,
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
    const body = await request.json();
    const { name, startDate, endDate } = body ?? {};

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 },
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid startDate or endDate" },
        { status: 400 },
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "endDate must be later than startDate" },
        { status: 400 },
      );
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

    // Check for overlapping sprints in this group
    const overlapping = await Sprint.findOne({
      group: group._id,
      startDate: { $lt: end },
      endDate: { $gt: start },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: "Sprint dates overlap with an existing sprint" },
        { status: 400 },
      );
    }

    const sprint = await Sprint.create({
      group: group._id,
      name: name ?? undefined,
      startDate: start,
      endDate: end,
    });

    return NextResponse.json(sprint, { status: 201 });
  } catch (error) {
    console.error("Error creating sprint:", error);
    return NextResponse.json(
      { error: "Failed to create sprint" },
      { status: 500 },
    );
  }
}

// GET /api/groups/:groupId/sprints
// Lists sprints for the group, sorted by startDate descending.

export async function GET(
  request: Request,
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
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");

    let limit = 50;
    let offset = 0;

    if (limitParam !== null) {
      const parsedLimit = Number(limitParam);
      if (Number.isNaN(parsedLimit)) {
        return NextResponse.json(
          { error: "limit must be a valid number" },
          { status: 400 },
        );
      }
      limit = Math.max(0, Math.floor(parsedLimit));
    }

    if (offsetParam !== null) {
      const parsedOffset = Number(offsetParam);
      if (Number.isNaN(parsedOffset)) {
        return NextResponse.json(
          { error: "offset must be a valid number" },
          { status: 400 },
        );
      }
      offset = Math.max(0, Math.floor(parsedOffset));
    }

    await connectMongoDB();

    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // If user is not a member, return empty list (but still 200)
    if (!isUserInGroup(group.members, session.user.id)) {
      return NextResponse.json([], { status: 200 });
    }

    const sprints = await Sprint.find({ group: group._id })
      .sort({ startDate: -1 })
      .skip(offset)
      .limit(limit);

    return NextResponse.json(sprints, { status: 200 });
  } catch (error) {
    console.error("Error listing sprints:", error);
    return NextResponse.json(
      { error: "Failed to list sprints" },
      { status: 500 },
    );
  }
}
