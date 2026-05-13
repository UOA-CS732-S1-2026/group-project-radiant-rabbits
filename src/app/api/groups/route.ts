import { log } from "node:console";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { checkRepoAccess } from "@/app/lib/githubService";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { triggerSync } from "@/app/lib/syncService";
import { normalizeUserRef } from "@/app/lib/userRef";
import { Group, User } from "../../lib/models";

function generateInviteCode() {
  // Short uppercase codes are easy to share verbally in class/team settings,
  // while still giving enough space to avoid collisions for this app's scale.
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let inviteCode = "";
  for (let i = 0; i < 8; i++) {
    inviteCode += characters.charAt(
      Math.floor(Math.random() * characters.length),
    );
  }
  return inviteCode;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(options);
    const sessionWithToken = session as { accessToken?: string };

    // Group creation depends on a real GitHub identity because repository
    // membership is part of the authorization model.
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // The token is needed immediately to prove the user can read the repository
    // they are attaching to the group.
    if (!sessionWithToken.accessToken) {
      return NextResponse.json(
        { error: "GitHub access token missing. Please sign in again." },
        { status: 401 },
      );
    }

    const { description, repoOwner, repoName } = await request.json();

    // If the user does not input a description, return an error
    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 },
      );
    }

    // If the user repository link lacks a repoOwner or repoName, return an error
    if (!repoOwner || !repoName) {
      return NextResponse.json(
        { error: "Repository name and owner is required" },
        { status: 400 },
      );
    }

    await connectMongoDB();

    // One active group per repository avoids two teams syncing and caching the
    // same GitHub source under different invite codes.
    const existingGroup = await Group.findOne({ repoOwner, repoName });

    // If the group already exists for the repository, return an error
    if (existingGroup) {
      return NextResponse.json(
        { error: "A group already exists for this repository" },
        { status: 409 },
      );
    }

    // Creating a group should not expose private repo metadata to someone who
    // only knows an owner/name pair.
    const repoAccess = await checkRepoAccess(
      sessionWithToken.accessToken,
      repoOwner,
      repoName,
    );

    if (!repoAccess) {
      return NextResponse.json(
        { error: "You do not have access to this GitHub repository" },
        { status: 403 },
      );
    }

    // The database unique index is the final guard against rare invite-code
    // collisions; the random code keeps the common path simple.
    const inviteCode = generateInviteCode();

    const group = await Group.create({
      name: repoName,
      description,
      inviteCode,
      members: [normalizeUserRef(session.user.id)],
      repoOwner,
      repoName,
      createdBy: normalizeUserRef(session.user.id),
      lastSyncAt: new Date(),
      syncStatus: "pending",
      syncError: null,
      iterationFieldConfigured: null,
    });

    // Newly-created groups become current so the next dashboard request does
    // not strand the creator on the group selection flow.
    await User.findOneAndUpdate(
      { githubId: session.user.id },
      { currentGroupId: group._id },
    );

    // Sync can take multiple GitHub requests, so the API returns after queuing
    // work and lets the UI poll syncStatus.
    triggerSync(group._id.toString(), sessionWithToken.accessToken);

    // Return the created group info with a success message
    return NextResponse.json(
      {
        group: {
          id: group._id,
          name: group.name,
          description: group.description,
          inviteCode: group.inviteCode,
          repoOwner: group.repoOwner,
          repoName: group.repoName,
          createdBy: group.createdBy,
          lastSyncAt: group.lastSyncAt,
          syncStatus: group.syncStatus,
          syncError: group.syncError,
          iterationFieldConfigured: group.iterationFieldConfigured,
        },
        message: "Group Successfully Created",
      },
      { status: 201 },
    );
    // If there is an internal error, print the error to the console
  } catch (error) {
    log("Error creating group:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 },
    );
  }
}
