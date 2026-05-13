import type mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import {
  Commit,
  Group,
  Issue,
  PullRequest,
  Sprint,
  SprintTask,
  User,
} from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";

// Only available outside production so demo data never leaks into a live DB.
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 },
    );
  }

  const session = await getServerSession(options);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await connectMongoDB();

  const user = await User.findOne({ githubId: session.user.id });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const DEMO_REPO_OWNER = "demo-org";
  const DEMO_REPO_NAME = "sprint-hub-demo";

  // Wipe any existing demo group so re-seeding is idempotent.
  const existing = await Group.findOne({
    repoOwner: DEMO_REPO_OWNER,
    repoName: DEMO_REPO_NAME,
  });
  if (existing) {
    const gid = existing._id;
    await Promise.all([
      Sprint.deleteMany({ group: gid }),
      Commit.deleteMany({ group: gid }),
      PullRequest.deleteMany({ group: gid }),
      Issue.deleteMany({ group: gid }),
      SprintTask.deleteMany({ group: gid }),
      Group.deleteOne({ _id: gid }),
    ]);
  }

  // Create the demo group and add the current user as a member.
  const group = await Group.create({
    name: "Sprint Hub Demo",
    description: "Auto-seeded demo group for UI testing.",
    active: true,
    inviteCode: `DEMO${Date.now().toString(36).toUpperCase()}`,
    members: [user._id],
    repoOwner: DEMO_REPO_OWNER,
    repoName: DEMO_REPO_NAME,
    createdBy: user._id,
    syncStatus: "success",
    lastSyncAt: new Date(),
    iterationFieldConfigured: true,
  });

  const groupId = group._id as mongoose.Types.ObjectId;

  // Set this group as the user's current group so they land straight in the demo.
  await User.updateOne(
    { _id: user._id },
    { $set: { currentGroupId: groupId } },
  );

  // Sprint windows — 2-week sprints, 5 total (4 done + 1 active).
  const now = new Date();
  const DAY = 24 * 60 * 60 * 1000;
  const sprintMeta = [
    { name: "1", offset: -70, status: "COMPLETED" as const },
    { name: "2", offset: -56, status: "COMPLETED" as const },
    { name: "3", offset: -42, status: "COMPLETED" as const },
    { name: "4", offset: -28, status: "COMPLETED" as const },
    { name: "5", offset: -7, status: "ACTIVE" as const },
  ];

  const contributors = [
    { login: user.login ?? "you", name: user.name },
    { login: "alice-dev", name: "Alice Johnson" },
    { login: "bob-smith", name: "Bob Smith" },
    { login: "carol-white", name: "Carol White" },
  ];

  const taskTitles = [
    "Set up CI pipeline",
    "Add authentication flow",
    "Fix dashboard layout",
    "Write unit tests for API",
    "Implement dark mode",
    "Refactor sprint service",
    "Add CSV export",
    "Fix mobile nav",
    "Improve error messages",
    "Profile slow queries",
    "Add pagination",
    "Document onboarding flow",
    "Resolve merge conflicts in main",
    "Upgrade dependencies",
    "Add contribution card animations",
    "Fix colour contrast issues",
  ];

  const prTitles = [
    "feat: add sprint velocity chart",
    "fix: correct contrast on badge text",
    "feat: GitHub sync improvements",
    "fix: dashboard metrics not loading",
    "refactor: extract shared Button component",
    "feat: AI sprint review generation",
    "fix: leave group redirect",
    "feat: add sprint task filtering",
    "chore: upgrade Next.js to 15",
    "fix: mobile layout overflow",
  ];

  const issueTitles = [
    "Sprint velocity chart is empty after sync",
    "Leave group button too small",
    "Dark mode colours need updating",
    "Add sprint goal editing",
    "Contribution card shows stale data",
    "Past sprints page slow to load",
    "Avatar initials truncated on mobile",
    "Improve empty state messaging",
    "Dashboard h1 needs aria label",
    "Sprint focus textarea loses focus",
  ];

  let issueCounter = 1;
  let prCounter = 1;
  let commitCounter = 1;

  for (let si = 0; si < sprintMeta.length; si++) {
    const meta = sprintMeta[si];
    const startDate = new Date(now.getTime() + meta.offset * DAY);
    const endDate = new Date(startDate.getTime() + 14 * DAY);
    const isActive = meta.status === "ACTIVE";

    const sprint = await Sprint.create({
      name: meta.name,
      startDate,
      endDate,
      goal: isActive
        ? "Ship the accessibility overhaul and stabilise the sprint transition flow."
        : `Complete sprint ${meta.name} deliverables and prepare handoff notes.`,
      status: meta.status,
      isCurrent: isActive,
      group: groupId,
      iterationId: `iteration-${si + 1}`,
    });

    const sprintId = sprint._id as mongoose.Types.ObjectId;

    // Commits — spread across the sprint window for each contributor.
    const commitDocs = contributors.flatMap((c, ci) =>
      Array.from({ length: 4 + ci }, (_, k) => {
        const d = new Date(
          startDate.getTime() + ((k + 1) / (5 + ci)) * 14 * DAY,
        );
        return {
          sha: `sha-${si}-${ci}-${k}-${commitCounter++}`,
          message: `${taskTitles[(si * 3 + ci + k) % taskTitles.length]}`,
          author: {
            name: c.name,
            login: c.login,
            email: `${c.login}@demo.com`,
          },
          date: d,
          filesChanged: 1 + k,
          group: groupId,
        };
      }),
    );
    await Commit.insertMany(commitDocs);

    // PRs — 2-3 per sprint, mix of merged and open.
    const prDocs = Array.from({ length: 3 }, (_, k) => {
      const createdAt = new Date(startDate.getTime() + (k + 1) * 3 * DAY);
      const merged = !isActive || k < 2;
      return {
        number: prCounter++,
        title: prTitles[(si * 2 + k) % prTitles.length],
        state: merged ? "MERGED" : "OPEN",
        createdAt,
        closedAt: merged ? new Date(createdAt.getTime() + 2 * DAY) : null,
        mergedAt: merged ? new Date(createdAt.getTime() + 2 * DAY) : null,
        author: contributors[(si + k) % contributors.length].login,
        group: groupId,
      };
    });
    await PullRequest.insertMany(prDocs);

    // Issues — 3 per sprint.
    const issueDocs = Array.from({ length: 3 }, (_, k) => {
      const createdAt = new Date(startDate.getTime() + k * 4 * DAY);
      const closed = !isActive || k === 0;
      return {
        number: issueCounter++,
        title: issueTitles[(si * 2 + k) % issueTitles.length],
        state: closed ? "CLOSED" : "OPEN",
        createdAt,
        closedAt: closed ? new Date(createdAt.getTime() + 5 * DAY) : null,
        author: contributors[k % contributors.length].login,
        group: groupId,
        sprint: sprintId,
      };
    });
    await Issue.insertMany(issueDocs);

    // Sprint tasks — 8 per sprint in a realistic status mix.
    const taskStatuses: Array<"TODO" | "IN_PROGRESS" | "DONE"> = isActive
      ? [
          "DONE",
          "DONE",
          "DONE",
          "IN_PROGRESS",
          "IN_PROGRESS",
          "TODO",
          "TODO",
          "TODO",
        ]
      : ["DONE", "DONE", "DONE", "DONE", "DONE", "DONE", "TODO", "IN_PROGRESS"];

    const taskDocs = taskStatuses.map((status, k) => ({
      title: taskTitles[(si * 4 + k) % taskTitles.length],
      status,
      assignees: [contributors[k % contributors.length].login],
      issueNumber: 100 + si * 10 + k,
      sprint: sprintId,
      group: groupId,
    }));
    await SprintTask.insertMany(taskDocs);
  }

  return NextResponse.json({
    ok: true,
    message:
      "Demo group seeded. Reload the app — you are now in the Sprint Hub Demo group.",
    groupName: "Sprint Hub Demo",
    sprints: sprintMeta.length,
  });
}
