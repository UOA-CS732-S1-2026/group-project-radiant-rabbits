import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group, Sprint } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";

// Helper to load group + membership
async function getGroupForUser(groupId: string, userId: string) {
  const group = await Group.findById(groupId);
  if (!group) {
    return { status: 404, error: "Group not found" as const };
  }
  if (!group.members.includes(userId)) {
    return {
      status: 403,
      error: "You are not a member of this group" as const,
    };
  }
  return { group } as const;
}

// GET /api/groups/:groupId/sprints/:sprintId

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string; sprintId: string }> },
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

    await connectMongoDB();

    const { group, status, error } = await getGroupForUser(
      groupId,
      session.user.id,
    );

    if (!group) {
      return NextResponse.json({ error }, { status });
    }

    const sprint = await Sprint.findOne({ _id: sprintId, group: group._id });
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    return NextResponse.json(sprint, { status: 200 });
  } catch (err) {
    console.error("Error getting sprint:", err);
    return NextResponse.json(
      { error: "Failed to get sprint" },
      { status: 500 },
    );
  }
}

// PUT /api/groups/:groupId/sprints/:sprintId

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ groupId: string; sprintId: string }> },
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
    const body = await request.json();
    const { name, startDate, endDate } = body ?? {};

    await connectMongoDB();

    const { group, status, error } = await getGroupForUser(
      groupId,
      session.user.id,
    );

    if (!group) {
      return NextResponse.json({ error }, { status });
    }

    const sprint = await Sprint.findOne({ _id: sprintId, group: group._id });
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    let start = sprint.startDate;
    let end = sprint.endDate;

    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return NextResponse.json(
          { error: "Invalid startDate" },
          { status: 400 },
        );
      }
    }

    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });
      }
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "endDate must be later than startDate" },
        { status: 400 },
      );
    }

    // Check for overlapping sprints, excluding this sprint itself
    const overlapping = await Sprint.findOne({
      _id: { $ne: sprint._id },
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

    sprint.name = name ?? sprint.name;
    sprint.startDate = start;
    sprint.endDate = end;

    await sprint.save();

    return NextResponse.json(sprint, { status: 200 });
  } catch (err) {
    console.error("Error updating sprint:", err);
    return NextResponse.json(
      { error: "Failed to update sprint" },
      { status: 500 },
    );
  }
}

// DELETE /api/groups/:groupId/sprints/:sprintId

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string; sprintId: string }> },
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

    await connectMongoDB();

    const { group, status, error } = await getGroupForUser(
      groupId,
      session.user.id,
    );

    if (!group) {
      return NextResponse.json({ error }, { status });
    }

    const sprint = await Sprint.findOneAndDelete({
      _id: sprintId,
      group: group._id,
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Error deleting sprint:", err);
    return NextResponse.json(
      { error: "Failed to delete sprint" },
      { status: 500 },
    );
  }
}
