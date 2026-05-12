import { NextResponse } from "next/server";
import { Sprint } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;

    const { currentSprintId } = await req.json();
    await connectMongoDB();

    const currentSprint = await Sprint.findOne({
      _id: currentSprintId,
      group: groupId,
    });
    if (!currentSprint) {
      return NextResponse.json(
        { error: "Current sprint not found" },
        { status: 404 },
      );
    }

    const nextSprint = await Sprint.findOneAndUpdate(
      {
        group: groupId,
        startDate: { $gt: currentSprint.startDate },
        status: "PLANNING",
      },
      { $set: { status: "ACTIVE", isCurrent: true } },
      {
        sort: { startDate: 1 },
        returnDocument: "after",
      },
    );

    if (!nextSprint) {
      console.error(
        `Next planning sprint not found for group ${groupId} after ${currentSprintId}`,
      );
      return NextResponse.json(
        { error: "Next planning sprint not found" },
        { status: 404 },
      );
    }

    await Sprint.updateOne(
      { _id: currentSprintId },
      { $set: { status: "COMPLETED", isCurrent: false } },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Transition Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
