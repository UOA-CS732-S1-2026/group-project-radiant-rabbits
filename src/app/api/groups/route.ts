import { log } from "node:console";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { checkRepoAccess } from "@/app/lib/githubService";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { triggerSync } from "@/app/lib/syncService";
import { Group } from "../../lib/models";

// Helper function to generate a random 8-character invite code
function generateInviteCode() {
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

    // Check if user has logged in with a valid Github account
    if (!session?.user?.id) {
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

    const { name, description, repoOwner, repoName } = await request.json();

    // If the user does not input a name or description, return an error
    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description is required" },
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

    // Connect to MongoDB and create a new group with the provided name, description
    // Generate a unique invite code
    await connectMongoDB();

    // Check if the group already exists for the associated repository
    const existingGroup = await Group.findOne({ repoOwner, repoName });

    // If the group already exists for the repository, return an error
    if (existingGroup) {
      return NextResponse.json(
        { error: "A group already exists for this repository" },
        { status: 409 },
      );
    }

    // Check if the user has access to the associated repository with their GitHub account
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

    // Otherwise, create the group and generate a unique invite code
    const inviteCode = generateInviteCode();

    const group = await Group.create({
      name: name,
      description: description,
      inviteCode: inviteCode,
      members: [session.user.id],
      repoOwner: repoOwner,
      repoName: repoName,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSyncAt: new Date(),
      syncStatus: "pending",
      syncError: null,
    });

    // Fire-and-forget: start syncing GitHub data in the background.
    // This doesn't block response — the user sees "Group Created" while the sync runs behind the scenes.
    if (sessionWithToken.accessToken) {
      triggerSync(group._id.toString(), sessionWithToken.accessToken);
    }

    // Return the created group info with a success message
    return NextResponse.json(
      {
        group: {
          name: group.name,
          description: group.description,
          inviteCode: group.inviteCode,
          members: group.members,
          createdBy: group.createdBy,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
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
