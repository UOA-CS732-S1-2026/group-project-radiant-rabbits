import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getCurrentSprintData } from "@/app/lib/currentSprintService";
import connectMongoDB from "@/app/lib/mongodbConnection";

export async function GET(request: Request) {
  try {
    await connectMongoDB();

    const { body } = await getCurrentSprintData();

    return NextResponse.json(body);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load tasks" },
      { status: 500 },
    );
  }
}
