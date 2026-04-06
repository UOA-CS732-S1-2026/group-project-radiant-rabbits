import { NextResponse } from "next/server";
import ProjectGroup from "@/models/ProjectGroup";
import Sprint from "@/models/Sprint";
import User from "@/models/User";

// Simple auth helper: expects x-github-id header representing the authenticated user.
export async function requireUser(request) {
  const githubId = request.headers.get("x-github-id");

  if (!githubId) {
    return {
      error: NextResponse.json(
        { message: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  const user = await User.findOne({ githubId });

  if (!user) {
    return {
      error: NextResponse.json({ message: "User not found" }, { status: 401 }),
    };
  }

  return { user };
}

export async function getGroupAndMembership(groupId, userId) {
  const group = await ProjectGroup.findById(groupId);

  if (!group) {
    return {
      notFound: NextResponse.json(
        { message: "Group not found" },
        { status: 404 },
      ),
    };
  }

  const isMember = group.members.some((memberId) => memberId.equals(userId));

  return { group, isMember };
}

// Checks if a sprint interval overlaps existing sprints for the same group.
// Overlap condition: new.start < existing.end && new.end > existing.start
export async function hasOverlappingSprint({
  groupId,
  startDate,
  endDate,
  excludeSprintId,
}) {
  const query = {
    group: groupId,
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  };

  if (excludeSprintId) {
    query._id = { $ne: excludeSprintId };
  }

  const overlapping = await Sprint.findOne(query).lean().exec();
  return Boolean(overlapping);
}
