import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { triggerSync } from "@/app/lib/syncService";
import { isUserInGroup } from "@/app/lib/userRef";

// Manual sync exists because GitHub changes are external to the app; users need
// a way to refresh data without waiting for a later navigation or background job.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const session = await getServerSession(options);

    // Sync uses the caller's GitHub token, so the request must come from an
    // authenticated group member rather than a background cron identity.
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
    if (!isUserInGroup(group.members, session.user.id)) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 },
      );
    }

    // GitHub sync is not transactional across all collections; rejecting
    // concurrent runs avoids interleaved writes and confusing syncStatus updates.
    if (group.syncStatus === "in_progress") {
      return NextResponse.json(
        { error: "Sync is already in progress" },
        { status: 409 },
      );
    }

    // The token can expire or be absent after auth changes, so fail before
    // marking the UI as syncing.
    const sessionWithToken = session as { accessToken?: string };
    if (!sessionWithToken.accessToken) {
      return NextResponse.json(
        { error: "Missing GitHub access token. Please re-authenticate." },
        { status: 401 },
      );
    }

    triggerSync(groupId, sessionWithToken.accessToken);

    // Return immediately because GitHub pagination can be slow and the UI polls
    // syncStatus for completion/errors.
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
