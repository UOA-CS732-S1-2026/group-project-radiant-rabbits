import { log } from "node:console";
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { isUserInGroup } from "@/app/lib/userRef";

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

    if (group.active === false) {
      return NextResponse.json(
        { error: "Archived groups cannot be selected as current" },
        { status: 400 },
      );
    }

    if (!isUserInGroup(group.members, session.user.id)) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 },
      );
    }

    const updatedUser = await User.findOneAndUpdate(
      { githubId: session.user.id },
      { currentGroupId: group._id },
      { new: true },
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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
