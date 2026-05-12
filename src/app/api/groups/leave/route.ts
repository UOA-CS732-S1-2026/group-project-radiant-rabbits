import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { isUserInGroup } from "@/app/lib/userRef";

export async function PUT(_request: Request) {
  try {
    if (process.env.TEST_MODE === "true") {
      return NextResponse.json(
        { message: "Successfully left the group" },
        { status: 200 },
      );
    }

    const session = await getServerSession(options);

    // Check if user has logged in with a valid Github account
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const sessionWithToken = session as { accessToken?: string };

    // Ensure user has access token
    if (!sessionWithToken.accessToken) {
      return NextResponse.json(
        { error: "GitHub access token missing. Please sign in again." },
        { status: 401 },
      );
    }

    await connectMongoDB();

    // Find the user in the database
    const user = await User.findOne({ githubId: session.user.id });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const normalisedUserId = user._id.toString();

    // Check if the user is currently in a group
    if (!user.currentGroupId) {
      return NextResponse.json(
        { error: "You are not currently in a group" },
        { status: 400 },
      );
    }

    const groupId = user.currentGroupId.toString();

    // Find the group the user is currently in
    const group = await Group.findById(groupId);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if the user is actually a member of the group
    if (!isUserInGroup(group.members, normalisedUserId)) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 },
      );
    }

    // Remove the user from the group's members array
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: normalisedUserId } },
      { new: true },
    );

    if (updatedGroup && updatedGroup.members.length === 0) {
      await Group.findByIdAndDelete(group._id);
    }

    // Update the user's currentGroupId to null
    await User.findByIdAndUpdate(normalisedUserId, {
      $set: { currentGroupId: null },
    });

    return NextResponse.json(
      { message: "Successfully left the group" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to leave group" },
      { status: 500 },
    );
  }
}
