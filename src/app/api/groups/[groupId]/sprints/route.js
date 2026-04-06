import { NextResponse } from "next/server";
import connectMongoDB from "@/app/lib/mongodbConnection";
import Sprint from "@/models/Sprint";
import {
  getGroupAndMembership,
  hasOverlappingSprint,
  requireUser,
} from "./helpers";

function parseDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function GET(request, { params }) {
  try {
    await connectMongoDB();

    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const { user } = auth;

    const { groupId } = params;

    const groupResult = await getGroupAndMembership(groupId, user._id);
    if (groupResult.notFound) return groupResult.notFound;

    const { group, isMember } = groupResult;

    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit") ?? "20";
    const offsetParam = url.searchParams.get("offset") ?? "0";

    const limit = Math.max(0, Number.parseInt(limitParam, 10) || 0);
    const offset = Math.max(0, Number.parseInt(offsetParam, 10) || 0);

    if (!isMember) {
      // For non-members, return an empty list per requirements.
      return NextResponse.json({ items: [], total: 0 }, { status: 200 });
    }

    const filter = { group: group._id };

    const [total, sprints] = await Promise.all([
      Sprint.countDocuments(filter),
      Sprint.find(filter).sort({ startDate: -1 }).skip(offset).limit(limit),
    ]);

    return NextResponse.json({ items: sprints, total }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to list sprints" },
      { status: 500 },
    );
  }
}

export async function POST(request, { params }) {
  try {
    await connectMongoDB();

    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const { user } = auth;

    const { groupId } = params;

    const groupResult = await getGroupAndMembership(groupId, user._id);
    if (groupResult.notFound) return groupResult.notFound;

    const { group, isMember } = groupResult;

    if (!isMember) {
      return NextResponse.json(
        { message: "User is not a member of this group" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name = "", startDate, endDate } = body;

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (!start || !end) {
      return NextResponse.json(
        { message: "startDate and endDate must be valid dates" },
        { status: 400 },
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { message: "endDate must be later than startDate" },
        { status: 400 },
      );
    }

    const overlaps = await hasOverlappingSprint({
      groupId: group._id,
      startDate: start,
      endDate: end,
    });

    if (overlaps) {
      return NextResponse.json(
        {
          message:
            "Sprint dates overlap with an existing sprint for this group",
        },
        { status: 400 },
      );
    }

    const sprint = await Sprint.create({
      group: group._id,
      name,
      startDate: start,
      endDate: end,
    });

    return NextResponse.json(sprint, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to create sprint" },
      { status: 500 },
    );
  }
}
