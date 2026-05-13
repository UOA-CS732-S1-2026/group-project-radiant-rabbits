import { NextResponse } from "next/server";
import { GITHUB_ITERATION_FIELDS_DOCS_URL } from "@/lib/githubProjectDocs";

export function GET() {
  // Route through our origin so in-app help links and tests have a stable URL
  // even if the external GitHub docs target changes later.
  return NextResponse.redirect(GITHUB_ITERATION_FIELDS_DOCS_URL, 302);
}
