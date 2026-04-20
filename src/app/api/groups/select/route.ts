import { log } from "node:console";
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { isUserInGroup, normalizeUserRef } from "@/app/lib/userRef";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(options);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { groupId } = await request.json();

    if (!groupId) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 },
      );
    }

    if (!Types.ObjectId.isValid(groupId)) {
      return NextResponse.json(
        { error: "Invalid group ID format" },
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

    await User.findByIdAndUpdate(normalizeUserRef(session.user.id), {
      currentGroupId: group._id,
    });

    return NextResponse.json(
      {
        message: "Current group updated successfully",
        group: {
          id: group._id,
          name: group.name,
          repoOwner: group.repoOwner,
          repoName: group.repoName,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    log("Error selecting current group:", error);
    return NextResponse.json(
      { error: "Failed to update current group" },
      { status: 500 },
    );
  }
}
