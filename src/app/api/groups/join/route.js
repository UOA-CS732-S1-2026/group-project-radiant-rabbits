import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { Group } from "../../lib/models";

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        const { inviteCode } = await request.json();

        if (!inviteCode) {
            return NextResponse.json(
                { error: "Invite code is required" },
                { status: 400 }
            )
        }
        
        await connectMongoDB();

        const group = await Group.findOne({
            inviteCode: inviteCode.trim(),
        });

        if (!group) {
            return NextResponse.json(
                { error: "Group not found" },
                { status: 404 }
            );
        }

        if (group.members.some((memberId) => memberId.toString() === session.user.id)) {
            return NextResponse.json(
                { error: "User is already a member" },
                { status: 400 }
            );
        }

        const updatedGroup = await Group.findByIdAndUpdate(
            group._id,
            { $addToSet: { members: session.user.id } },
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