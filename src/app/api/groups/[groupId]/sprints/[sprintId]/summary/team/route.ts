import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import {
  buildTeamSummaryPrompt,
  buildTeamWorkloadProfile,
  ContributionSummaryAiError,
  generateContributionSummaryText,
  getCachedSummary,
  hashProfile,
  upsertCachedSummary,
} from "@/app/lib/contributionSummaryService";
import { Group, Sprint } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { isUserInGroup } from "@/app/lib/userRef";

type AuthResult = { ok: true } | { ok: false; error: string; status: number };

// This route generates a contribution summary for the whole team in a sprint, using an LLM.
// It checks if a cached summary exists with the same inputHash and returns it if valid, otherwise it generates a new one and caches it.
async function authorize(
  groupId: string,
  sprintId: string,
  userId: string,
): Promise<AuthResult> {
  const group = await Group.findById(groupId);
  if (!group) {
    return { ok: false, error: "Group not found", status: 404 };
  }
  if (!isUserInGroup(group.members, userId)) {
    return {
      ok: false,
      error: "You are not a member of this group",
      status: 403,
    };
  }
  const sprint = await Sprint.findOne({ _id: sprintId, group: group._id });
  if (!sprint) {
    return { ok: false, error: "Sprint not found", status: 404 };
  }
  return { ok: true };
}

function mapErrorToResponse(error: unknown) {
  if (error instanceof ContributionSummaryAiError) {
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 502 },
    );
  }
  if (error instanceof Error) {
    if (error.message.includes("Invalid group or sprint")) {
      return NextResponse.json(
        { error: "Invalid groupId or sprintId" },
        { status: 400 },
      );
    }
    if (
      error.message === "Group not found" ||
      error.message === "Sprint not found"
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
  }
  return NextResponse.json(
    { error: "Failed to generate summary" },
    { status: 500 },
  );
}

// GET /api/groups/:groupId/sprints/:sprintId/summary/team
// Returns the cached team summary, or { summary: null } if none has been
// generated yet. Never calls the LLM.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; sprintId: string }> },
) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { groupId, sprintId } = await params;
    await connectMongoDB();

    const auth = await authorize(groupId, sprintId, session.user.id);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const cached = await getCachedSummary({
      groupId,
      sprintId,
      kind: "team",
      contributorKey: null,
    });

    if (!cached) {
      return NextResponse.json({ summary: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        summary: cached.summary,
        generatedAt: cached.generatedAt,
        model: cached.model,
        provider: cached.provider,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error loading team summary:", error);
    return NextResponse.json(
      { error: "Failed to load summary" },
      { status: 500 },
    );
  }
}

// POST /api/groups/:groupId/sprints/:sprintId/summary/team
// Body: { regenerate?: boolean }
// Generates a team summary, or returns the cached one if its inputHash
// matches the freshly-aggregated workload profile (and !regenerate).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string; sprintId: string }> },
) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { groupId, sprintId } = await params;

    let body: { regenerate?: boolean } = {};
    try {
      body = (await request.json()) as { regenerate?: boolean };
    } catch {
      body = {};
    }
    const regenerate = body.regenerate === true;

    await connectMongoDB();

    const auth = await authorize(groupId, sprintId, session.user.id);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const profile = await buildTeamWorkloadProfile(groupId, sprintId);
    const inputHash = hashProfile(profile);

    const cached = await getCachedSummary({
      groupId,
      sprintId,
      kind: "team",
      contributorKey: null,
    });

    if (cached && cached.inputHash === inputHash && !regenerate) {
      return NextResponse.json(
        {
          summary: cached.summary,
          cached: true,
          generatedAt: cached.generatedAt,
          model: cached.model,
          provider: cached.provider,
        },
        { status: 200 },
      );
    }

    const prompt = buildTeamSummaryPrompt(profile);
    console.log("[team prompt]\n", prompt);
    const generated = await generateContributionSummaryText(prompt);
    console.log("[team summary]", generated.text);

    await upsertCachedSummary({
      groupId,
      sprintId,
      kind: "team",
      contributorKey: null,
      summary: generated.text,
      inputHash,
      model: generated.model,
      provider: generated.provider,
    });

    return NextResponse.json(
      {
        summary: generated.text,
        cached: false,
        generatedAt: new Date(),
        model: generated.model,
        provider: generated.provider,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error generating team summary:", error);
    return mapErrorToResponse(error);
  }
}
