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

function fallbackMemberName(memberId: string) {
  // Legacy group memberships can exist before a profile row is backfilled; show
  // a stable label instead of hiding that member.
  return `Member ${memberId.slice(0, 8)}`;
}

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

  // Preserve joined order from the group document so the list does not shuffle
  // when Mongo returns profiles in a different order.
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

export default async function TeammatesPage() {
  const session = await getServerSession(options);
  const isTestMode = process.env.TEST_MODE === "true";
  if (!session?.user) {
    redirect("/");
  }

  if (isTestMode) {
    return (
      <Teammates
        status="ready"
        members={[
          {
            id: "test-user",
            name: "Playwright Test User",
            login: "playwright",
            email: "playwright@test.local",
            avatarUrl: null,
          },
        ]}
      />
    );
  }

  await connectMongoDB();

  const user = await User.findOne({ githubId: session.user.id }).select(
    "currentGroupId",
  );

  // Keep the page recoverable for authenticated users who have not joined a
  // group yet.
  if (!user?.currentGroupId) {
    return (
      <Teammates
        status="empty"
        statusMessage="No group selected. Create or join a group to see teammates."
      />
    );
  }

  // Current-group pointers can become stale after archive/delete operations.
  const group = await Group.findById(user.currentGroupId).select("_id");
  if (!group) {
    return (
      <Teammates status="empty" statusMessage="Current group not found." />
    );
  }

  const members = await loadTeammates(group._id);
  return <Teammates status="ready" members={members} />;
}
