import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { normalizeUserRef, normalizeUserRefString } from "@/app/lib/userRef";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LeanMemberProfile = {
  _id: unknown;
  name?: string | null;
  login?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

function fallbackMemberName(memberId: string) {
  // Last-resort display label when no profile exists yet.
  return `Member ${memberId.slice(0, 8)}`;
}

export async function GET(_request: NextRequest) {
  try {
    // Only authenticated users can read group teammates.
    const session = await getServerSession(options);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    await connectMongoDB();

    // Convert session user id into the same reference format used in group.members.
    const userRef = normalizeUserRef(session.user.id);
    if (!userRef) {
      return NextResponse.json(
        { error: "Invalid user reference" },
        { status: 400 },
      );
    }

    // Fetch the user to get their currentGroupId
    const user = await User.findOne({ githubId: session.user.id })
      .select("currentGroupId")
      .lean();

    if (!user?.currentGroupId) {
      return NextResponse.json(
        { group: null, members: [] },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    // Find the group using the user's currentGroupId and verify user is still a member
    const group = await Group.findOne({
      _id: user.currentGroupId,
      members: userRef,
    }).lean();

    if (!group) {
      return NextResponse.json(
        { group: null, members: [] },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    // Normalize member ids so they can be matched with User profile documents.
    const memberIds = (group.members ?? [])
      .map((member: unknown) => normalizeUserRefString(member))
      .filter((memberId: string | null): memberId is string =>
        Boolean(memberId),
      );

    // Fetch only fields needed by the teammates UI.
    const profiles = (await User.find(
      { _id: { $in: memberIds } },
      { name: 1, login: 1, email: 1, avatarUrl: 1 },
    ).lean()) as LeanMemberProfile[];

    // Build quick lookup: member id -> profile.
    const profilesById = new Map(
      profiles
        .map((profile) => {
          const id = normalizeUserRefString(profile._id);
          return id ? [id, profile] : null;
        })
        .filter((entry): entry is [string, LeanMemberProfile] =>
          Boolean(entry),
        ),
    );

    // Preserve group member order while attaching profile data.
    const members = memberIds.map((memberId: string) => {
      const profile = profilesById.get(memberId);
      const displayName =
        profile?.name?.trim() ||
        profile?.login?.trim() ||
        fallbackMemberName(memberId);

      return {
        id: memberId,
        name: displayName,
        login: profile?.login ?? null,
        email: profile?.email ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
      };
    });

    return NextResponse.json(
      {
        group: {
          id: group._id.toString(),
          name: group.name,
          description: group.description,
          inviteCode: group.inviteCode,
          repoOwner: group.repoOwner,
          repoName: group.repoName,
          memberCount: memberIds.length,
        },
        members,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("Error fetching current group members:", error);
    return NextResponse.json(
      { error: "Failed to fetch teammates" },
      { status: 500 },
    );
  }
}
