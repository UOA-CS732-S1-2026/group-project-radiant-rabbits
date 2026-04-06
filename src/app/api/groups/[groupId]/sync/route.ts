import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { triggerSync } from "@/app/lib/syncService";

// POST /api/groups/:groupId/sync
// Manually triggers a GitHub data sync for this group.
// Used when a user wants to refresh the data without waiting for the next auto-sync.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const session = await getServerSession(options);

    // Must be logged in
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { groupId } = await params;

    await connectMongoDB();

    // Check the group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Only group members can trigger a sync
    if (!group.members.includes(session.user.id)) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 },
      );
    }

    // Don't start a new sync if one is already running
    if (group.syncStatus === "in_progress") {
      return NextResponse.json(
        { error: "Sync is already in progress" },
        { status: 409 },
      );
    }

    // Fire-and-forget: start the sync in the background
    const sessionWithToken = session as { accessToken?: string };
    if (!sessionWithToken.accessToken) {
      return NextResponse.json(
        { error: "Missing GitHub access token. Please re-authenticate." },
        { status: 401 },
      );
    }

    triggerSync(groupId, sessionWithToken.accessToken);

    // Return immediately - the sync runs in the background
    return NextResponse.json(
      { message: "Sync started", syncStatus: "in_progress" },
      { status: 202 },
    );
  } catch (error) {
    console.error("Error triggering sync:", error);
    return NextResponse.json(
      { error: "Failed to trigger sync" },
      { status: 500 },
    );
  }
}
