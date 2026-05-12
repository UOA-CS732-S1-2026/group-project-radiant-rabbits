import { NextResponse } from "next/server";
import { Sprint } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;

    const { currentSprintId, nextSprintId } = await req.json();
    await connectMongoDB();

    await Sprint.updateOne(
      { _id: currentSprintId },
      { $set: { status: "COMPLETED", isCurrent: false } },
    );

    const nextSprint = await Sprint.findOneAndUpdate(
      {
        _id: nextSprintId,
        group: groupId,
        status: "PLANNING",
      },
      { $set: { status: "ACTIVE", isCurrent: true } },
      {
        returnDocument: "after",
      },
    );

    if (!nextSprint) {
      console.error(
        `Next sprint not found with ID ${nextSprintId} for group ${groupId}`,
      );
      return NextResponse.json(
        { error: "Next planning sprint not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Transition Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
