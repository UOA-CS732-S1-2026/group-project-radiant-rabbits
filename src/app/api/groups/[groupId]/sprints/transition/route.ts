import { NextResponse } from "next/server";
import { Sprint } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;

    const { currentSprintId, nextSprintNumber } = await req.json();
    await connectMongoDB();

    await Sprint.updateOne(
      { _id: currentSprintId },
      { $set: { status: "COMPLETED", isCurrent: false } },
    );

    const nextSprint = await Sprint.findOneAndUpdate(
      {
        group: groupId,
        name: new RegExp(`Sprint\\s*${nextSprintNumber}$`, "i"),
        status: "PLANNING",
      },
      { $set: { status: "ACTIVE", isCurrent: true } },
      {
        returnDocument: "after",
      },
    );

    if (!nextSprint) {
      console.error(
        `Next sprint not found for group ${groupId}, number ${nextSprintNumber}`,
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
