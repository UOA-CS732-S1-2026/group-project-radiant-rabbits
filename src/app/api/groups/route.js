import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { Group } from "../../lib/models";

function generateInviteCode() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let inviteCode = "";
    for (let i = 0; i < 8; i++) {
        inviteCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return inviteCode;
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        const { name, description } = await request.json();

        if (!name || !description) {
            return NextResponse.json(
                { error: "Name and description is required" },
                { status: 400 }
            )
        }

        await connectMongoDB();

        const inviteCode = generateInviteCode();

        const group = await Group.create({
            name: name,
            description: description,
            inviteCode: inviteCode,
            members: [session.user.id], // Assuming we have their Github ID
            createdBy: session.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return NextResponse.json({ 
            group: {
                name: group.name,
                description: group.description,
                inviteCode: group.inviteCode,
                members: group.members,
                createdBy: group.createdBy,
                createdAt: group.createdAt,
                updatedAt: group.updatedAt,
            },
            message: "Group Successfully Created" 
        }, 
        { status: 201 });

    } catch {
        return NextResponse.json(
            { error: "Failed to create group" },
            { status: 500 }, 
        );
    }
}

