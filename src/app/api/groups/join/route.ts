import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(options);

    if (!session?.user?.name) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const userName = session.user.name;

    const { inviteCode } = await request.json();

    if (!inviteCode) {
      return NextResponse.json(
        { error: "Invite code is required" },
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
        (member: { toString: () => string }) => member.toString() === userName,
      )
    ) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 400 },
      );
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      group._id,
      { $addToSet: { members: userName } },
      { new: true },
    );
    return NextResponse.json(
      { message: "Joined group successfully", group: updatedGroup },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to join group" },
      { status: 500 },
    );
  }
}
