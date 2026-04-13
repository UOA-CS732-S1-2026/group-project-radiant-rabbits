import { log } from "node:console";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Group from "@/app/database/models/Group";
import User from "@/app/database/models/User";
import { checkRepoAccess } from "@/app/lib/githubService";
import connectMongoDB from "@/app/lib/mongodbConnection";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(options);

    const sessionWithToken = session as { accessToken?: string };

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    if (!sessionWithToken.accessToken) {
      return NextResponse.json(
        { error: "GitHub access token missing. Please sign in again." },
        { status: 401 },
      );
    }

    const { inviteCode } = await request.json();

    if (!inviteCode) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 },
      );
    }

    const isValidFormat =
      inviteCode.length === 8 && /^[A-Z0-9]+$/i.test(inviteCode);

    if (!isValidFormat) {
      return NextResponse.json(
        { error: "Invalid format. Please enter the 8-character invite code." },
        { status: 400 },
      );
    }

    await connectMongoDB();

    const group = await Group.findOne({
      inviteCode: inviteCode.trim(),
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (
      group.members.some(
        (member: { toString: () => string }) =>
          member.toString() === session.user.id,
      )
    ) {
      await User.findOneAndUpdate(
        { githubId: session.user.id },
        { currentGroupId: group._id },
        { new: true },
      );

      return NextResponse.json(
        { message: "User is already a member", group },
        { status: 200 },
      );
    }

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

    const updatedGroup = await Group.findByIdAndUpdate(
      group._id,
      { $addToSet: { members: session.user.id }, updatedAt: new Date() },
      { new: true },
    );

    await User.findOneAndUpdate(
      { githubId: session.user.id },
      { currentGroupId: updatedGroup._id },
      { new: true },
    );

    return NextResponse.json(
      { message: "Joined group successfully", group: updatedGroup },
      { status: 200 },
    );
  } catch (error) {
    log("Error joining group:", error);
    return NextResponse.json(
      { error: "Failed to join group" },
      { status: 500 },
    );
  }
}
