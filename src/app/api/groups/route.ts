import { log } from "node:console";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import connectMongoDB from "@/app/lib/mongodbConnection";
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

    // Check if user has logged in with a valid Github account
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { name, description } = await request.json();

    // If the user does not input a name or description, return an error
    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description is required" },
        { status: 400 },
      );
    }

    // Connect to MongoDB and create a new group with the provided name, description
    // Generate a unique invite code
    await connectMongoDB();

    const inviteCode = generateInviteCode();

    const group = await Group.create({
      name: name,
      description: description,
      inviteCode: inviteCode,
      members: [session.user.id],
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

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
