import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group } from "@/app/lib/models/group.model";
import { User } from "@/app/lib/models/user.model";
import connectMongoDB from "@/app/lib/mongodbConnection";

export async function GET() {
  try {
    const session = await getServerSession(options);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    await connectMongoDB();

    const user = await User.findOne({ githubId: session.user.id });
    console.log("Found user:", user);

    if (!user?.currentGroupId) {
      return NextResponse.json({ currentGroup: null }, { status: 200 });
    }

    const group = await Group.findById(user.currentGroupId);

    if (!group) {
      return NextResponse.json({ currentGroup: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        currentGroup: {
          _id: group._id.toString(),
          name: group.name,
          repoName: group.repoName,
          repoOwner: group.repoOwner,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("GET /api/user/current-group failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch current group", details: error.message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { groupId } = await req.json();

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: "Invalid groupId" }, { status: 400 });
    }

    await connectMongoDB();

    const group = await Group.findById(groupId);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const isMember = group.members.map(String).includes(session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 },
      );
    }

    await User.findOneAndUpdate(
      { githubId: session.user.id },
      {
        githubId: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        currentGroupId: group._id,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return NextResponse.json(
      {
        message: "Current group updated",
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("POST /api/user/current-group failed:", error);
    return NextResponse.json(
      { error: "Failed to update current group", details: error.message },
      { status: 500 },
    );
  }
}
