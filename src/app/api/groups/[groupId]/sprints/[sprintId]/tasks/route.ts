import type mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { avatarUrlForLogin } from "@/app/lib/currentSprintService";
import { Group, Sprint, SprintTask } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { isUserInGroup } from "@/app/lib/userRef";

// Tasks are read from synced GitHub Project items rather than edited here, so
// this route stays read-only and reflects the last successful sync.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; sprintId: string }> },
) {
  try {
    const session = await getServerSession(options);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { groupId, sprintId } = await params;

    await connectMongoDB();

    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (!isUserInGroup(group.members, session.user.id)) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 },
      );
    }

    const sprint = await Sprint.findOne({ _id: sprintId, group: group._id });
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    const docs = await SprintTask.find({ group: group._id, sprint: sprintId })
      .select("title status assignees issueNumber")
      .lean<
        Array<{
          _id: mongoose.Types.ObjectId;
          title: string;
          status: "TODO" | "IN_PROGRESS" | "DONE";
          assignees: string[];
          issueNumber: number | null;
        }>
      >();

    const tasks = docs.map((t) => ({
      id: String(t._id),
      title: t.title,
      status: t.status,
      issueNumber: t.issueNumber ?? null,
      // Assignee names are GitHub logins from sync, so they can be resolved
      // directly to GitHub avatar URLs without another profile lookup.
      assignees: (t.assignees ?? []).map((name) => ({
        name,
        avatarUrl: avatarUrlForLogin(name),
      })),
    }));

    const breakdown = {
      todo: tasks.filter((t) => t.status === "TODO").length,
      inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      done: tasks.filter((t) => t.status === "DONE").length,
    };

    return NextResponse.json({ tasks, breakdown }, { status: 200 });
  } catch (err) {
    console.error("Error fetching sprint tasks:", err);
    return NextResponse.json(
      { error: "Failed to fetch sprint tasks" },
      { status: 500 },
    );
  }
}
