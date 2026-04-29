import { NextResponse } from "next/server";
import { getCurrentSprintData } from "@/app/lib/currentSprintService";

// API route to fetch current sprint data for the current sprint page
export async function GET() {
  const { status, body } = await getCurrentSprintData();
  return NextResponse.json(body, { status });
}
