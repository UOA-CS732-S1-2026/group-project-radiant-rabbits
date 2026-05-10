import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { normalizeUserRef } from "@/app/lib/userRef";

function makeInviteCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST() {
  if (process.env.E2E_TEST_MODE !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getServerSession(options);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  await connectMongoDB();

  const githubId = session.user.id;
  const normalizedUserId = normalizeUserRef(githubId);
  if (!normalizedUserId) {
    return NextResponse.json({ error: "Invalid test user" }, { status: 400 });
  }

  await User.findOneAndUpdate(
    { githubId },
    {
      $set: {
        githubId,
        login: `e2e-${githubId}`,
        name: "E2E Test User",
        email: `${githubId}@example.test`,
      },
      $setOnInsert: {
        avatarUrl: null,
      },
    },
    { upsert: true, setDefaultsOnInsert: true, new: true },
  );

  const repoOwner = "e2e-owner";
  const repoName = `smoke-repo-${Date.now()}`;

  const group = await Group.create({
    name: "E2E Smoke Group",
    description: "CI-only seeded group for smoke tests",
    inviteCode: makeInviteCode(),
    members: [normalizedUserId],
    repoOwner,
    repoName,
    createdBy: normalizedUserId,
    syncStatus: "pending",
    syncError: null,
    iterationFieldConfigured: false,
  });

  await User.findOneAndUpdate({ githubId }, { currentGroupId: group._id });

  return NextResponse.json({
    groupId: group._id.toString(),
    repoName,
    message: "E2E group created and selected",
  });
}
