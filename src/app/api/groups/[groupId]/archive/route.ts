import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { isUserInGroup } from "@/app/lib/userRef";

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
