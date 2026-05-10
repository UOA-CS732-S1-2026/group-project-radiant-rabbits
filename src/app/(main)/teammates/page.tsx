import type mongoose from "mongoose";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { normalizeUserRefString } from "@/app/lib/userRef";
import type { TeammateRowData } from "@/components/teammates/TeammateRow";
import Teammates from "@/components/teammates/Teammates";

type LeanMemberProfile = {
  _id: unknown;
  name?: string | null;
  login?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

// Helper function to create a fallback display name for a member with no profile information
function fallbackMemberName(memberId: string) {
  return `Member ${memberId.slice(0, 8)}`;
}

// Load profiles for the members of the user's current group
async function loadTeammates(
  groupId: mongoose.Types.ObjectId,
): Promise<TeammateRowData[]> {
  const groupDoc = await Group.findById(groupId).lean<{
    members?: unknown[];
  }>();

  const memberIds = (groupDoc?.members ?? [])
    .map((member) => normalizeUserRefString(member))
    .filter((memberId): memberId is string => Boolean(memberId));

  const profiles = (await User.find(
    { _id: { $in: memberIds } },
    { name: 1, login: 1, email: 1, avatarUrl: 1 },
  ).lean()) as LeanMemberProfile[];

  const profilesById = new Map(
    profiles
      .map((profile) => {
        const id = normalizeUserRefString(profile._id);
        return id ? [id, profile] : null;
      })
      .filter((entry): entry is [string, LeanMemberProfile] => Boolean(entry)),
  );

  // Order the members based on joined order
  return memberIds.map((memberId) => {
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
}

// Fetch all data required to display the teammates list
export default async function TeammatesPage() {
  const e2eTestMode = process.env.E2E_TEST_MODE === "true";
  const session = await getServerSession(options);
  if (!session?.user) {
    redirect("/");
  }

  if (e2eTestMode) {
    return <Teammates status="ready" members={[]} />;
  }

  await connectMongoDB();

  const user = await User.findOne({ githubId: session.user.id }).select(
    "currentGroupId",
  );

  // If the user has no current group, show error message
  if (!user?.currentGroupId) {
    return (
      <Teammates
        status="empty"
        statusMessage="No group selected. Create or join a group to see teammates."
      />
    );
  }

  // If the user's current group doesn't exist, show error message
  const group = await Group.findById(user.currentGroupId).select("_id");
  if (!group) {
    return (
      <Teammates status="empty" statusMessage="Current group not found." />
    );
  }

  // Load teammates for the user's current group and display
  const members = await loadTeammates(group._id);
  return <Teammates status="ready" members={members} />;
}
