import { log } from "node:console";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { checkRepoAccess } from "@/app/lib/githubService";
import { Group } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(options);

    const sessionWithToken = session as { accessToken?: string };

    // Check if user has logged in with a valid Github account
    if (!session?.user?.name) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Ensure user has access token
    if (!sessionWithToken.accessToken) {
      return NextResponse.json(
        { error: "GitHub access token missing. Please sign in again." },
        { status: 401 },
      );
    }

    const { inviteCode } = await request.json();

    // If the user does not input an invite code, return an error
    if (!inviteCode) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 },
      );
    }

    // Connect to MongoDB and find a group that matches the invite code
    await connectMongoDB();

    const group = await Group.findOne({
      inviteCode: inviteCode.trim(),
    });

    // If no group is found, return an error
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if user is already in that group
    // If they are, return an error.
    if (
      group.members.some(
        (member: { toString: () => string }) =>
          member.toString() === session.user.id,
      )
    ) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 400 },
      );
    }

    // Check if the user has access to the associated repository with their GitHub account
    // Using repo information associated with the group
    const repoAccess = await checkRepoAccess(
      sessionWithToken.accessToken,
      group.repoOwner,
      group.repoName,
    );

    if (!repoAccess) {
      return NextResponse.json(
        { error: "You do not have access to this GitHub repository." },
        { status: 403 },
      );
    }

    // Add the user to the group and return the updated group info
    const updatedGroup = await Group.findByIdAndUpdate(
      group._id,
      { $addToSet: { members: session.user.id } },
      { new: true },
    );
    return NextResponse.json(
      { message: "Joined group successfully", group: updatedGroup },
      { status: 200 },
    );

    // If there is an internal error, print the error to the console
  } catch (error) {
    log("Error joining group:", error);
    return NextResponse.json(
      { error: "Failed to join group" },
      { status: 500 },
    );
  }
}
