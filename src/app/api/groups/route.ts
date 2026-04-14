import { log } from "node:console";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { checkRepoAccess } from "@/app/lib/githubService";
import { Group } from "@/app/lib/models/group.model";
import { User } from "@/app/lib/models/user.model";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { triggerSync } from "@/app/lib/syncService";
import { normalizeUserRef } from "@/app/lib/userRef";

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

    const { description, repoOwner, repoName, sprintSettings } =
      await request.json();

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 },
      );
    }

    if (!repoOwner || !repoName) {
      return NextResponse.json(
        { error: "Repository name and owner is required" },
        { status: 400 },
      );
    }

    await connectMongoDB();

    const existingGroup = await Group.findOne({ repoOwner, repoName });

    if (existingGroup) {
      return NextResponse.json(
        { error: "A group already exists for this repository" },
        { status: 409 },
      );
    }

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

    const inviteCode = generateInviteCode();

    const group = await Group.create({
      name: repoName,
      description,
      inviteCode,
      members: [normalizeUserRef(session.user.id)],
      repoOwner,
      repoName,
      createdBy: normalizeUserRef(session.user.id),
      sprintSettings: {
        startDate: sprintSettings?.startDate,
        endDate: sprintSettings?.endDate,
        sprintLength: sprintSettings?.sprintLength,
        sprintLengthUnit: sprintSettings?.sprintLengthUnit,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSyncAt: new Date(),
      syncStatus: "pending",
      syncError: null,
    });

    await User.findOneAndUpdate(
      { githubId: session.user.id },
      { currentGroupId: group._id },
      { new: true },
    );

    if (sessionWithToken.accessToken) {
      triggerSync(group._id.toString(), sessionWithToken.accessToken);
    }

    return NextResponse.json(
      {
        group: {
          _id: group._id,
          name: group.name,
          description: group.description,
          inviteCode: group.inviteCode,
          members: group.members,
          repoOwner: group.repoOwner,
          repoName: group.repoName,
          createdBy: group.createdBy,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          sprintSettings: group.sprintSettings,
        },
        message: "Group Successfully Created",
      },
      { status: 201 },
    );
  } catch (error) {
    log("Error creating group:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 },
    );
  }
}
