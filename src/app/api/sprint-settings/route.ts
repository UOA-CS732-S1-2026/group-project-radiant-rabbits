import mongoose from "mongoose";
import { NextResponse } from "next/server";
import Group from "@/app/database/models/Group";

const MONGODB_URL = process.env.MONGODB_URL!;

async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URL);
  }

  console.log("Connected DB:", mongoose.connection.name);
  console.log("Group collection name:", Group.collection.name);
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    console.log("Request body:", body);

    const { groupId, startDate, endDate, sprintLength } = body;

    if (!groupId || !startDate || !endDate || sprintLength === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    console.log("groupId received:", groupId);
    console.log("is valid ObjectId:", mongoose.Types.ObjectId.isValid(groupId));

    const allGroups = await Group.find({});
    console.log("All groups found:", allGroups);

    const existingGroup = await Group.findById(groupId);
    console.log("Existing group:", existingGroup);

    if (!existingGroup) {
      return NextResponse.json(
        {
          error: "Group not found",
          debug: {
            connectedDB: mongoose.connection.name,
            collection: Group.collection.name,
            groupId,
            totalGroupsSeen: allGroups.length,
          },
        },
        { status: 404 },
      );
    }

    existingGroup.sprintSettings = {
      startDate,
      endDate,
      sprintLength,
    };
    existingGroup.updatedAt = new Date();

    await existingGroup.save();

    return NextResponse.json(existingGroup);
  } catch (error: any) {
    console.error("POST /api/sprint-settings failed:", error);
    return NextResponse.json(
      {
        error: "Failed to save sprint settings",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: "Invalid groupId" }, { status: 400 });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(group.sprintSettings || null);
  } catch (error: any) {
    console.error("GET sprint settings error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch sprint settings",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
