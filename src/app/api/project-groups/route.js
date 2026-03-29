import { NextResponse } from "next/server";
import connectMongoDB from "@/app/lib/mongodbConnection";
import ProjectGroup from "@/models/ProjectGroup";
import User from "@/models/User";

export async function POST(req) {
  try {
    await connectMongoDB();

    const body = await req.json();
    const {
      githubId,
      name,
      email,
      avatarUrl,
      groupName,
      description,
      inviteCode,
    } = body;

    let user = await User.findOne({ githubId });

    if (!user) {
      user = await User.create({
        githubId,
        name,
        email,
        avatarUrl,
      });
    }

    const projectGroup = await ProjectGroup.create({
      name: groupName,
      description,
      inviteCode,
      members: [user._id],
      createdBy: user._id,
    });

    return NextResponse.json(projectGroup, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to create project group" },
      { status: 500 },
    );
  }
}
