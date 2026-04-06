import { NextResponse } from "next/server";
import Task from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";

export async function GET() {
  try {
    await connectMongoDB();
    return NextResponse.json(
      { ok: true, message: "MongoDB connected" },
      { status: 200 },
    );
  } catch (error) {
    const details =
      process.env.NODE_ENV === "development" ? error?.message : undefined;
    return NextResponse.json(
      { ok: false, error: "MongoDB connection failed", details },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const { title, description } = await request.json();
    await connectMongoDB();
    await Task.create({ title, description });
    return NextResponse.json({ message: "Task Created" }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }
}
