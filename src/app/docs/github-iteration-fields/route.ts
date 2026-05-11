import { NextResponse } from "next/server";
import { GITHUB_ITERATION_FIELDS_DOCS_URL } from "@/lib/githubProjectDocs";

export function GET() {
  return NextResponse.redirect(GITHUB_ITERATION_FIELDS_DOCS_URL, 302);
}
