import { NextResponse } from "next/server";
import { getCurrentSprintData } from "@/app/lib/currentSprintService";

// Keep the route thin so the same current-sprint resolution logic can be reused
// by tests and server-side callers without duplicating auth/data rules.
export async function GET() {
  const { status, body } = await getCurrentSprintData();
  return NextResponse.json(body, { status });
}
