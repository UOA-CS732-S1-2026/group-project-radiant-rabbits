import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import {
  buildContributorSummaryPrompt,
  buildContributorWorkloadProfile,
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

// This route generates a contribution summary for one contributor in a sprint, using an LLM.
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
      error.message === "Sprint not found" ||
      error.message === "Contributor not found in this sprint"
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
  }
  return NextResponse.json(
    { error: "Failed to generate summary" },
    { status: 500 },
  );
}

// POST /api/groups/:groupId/sprints/:sprintId/summary/contributor
// Body: { contributor: string, regenerate?: boolean }
// Generates a workload summary for one contributor, or returns the cached
// one if its inputHash matches and !regenerate.
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

    let body: { contributor?: string; regenerate?: boolean } = {};
    try {
      body = (await request.json()) as {
        contributor?: string;
        regenerate?: boolean;
      };
    } catch {
      body = {};
    }
    const contributor =
      typeof body.contributor === "string" ? body.contributor.trim() : "";
    const regenerate = body.regenerate === true;

    if (!contributor) {
      return NextResponse.json(
        { error: "contributor is required" },
        { status: 400 },
      );
    }

    await connectMongoDB();

    const auth = await authorize(groupId, sprintId, session.user.id);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const profile = await buildContributorWorkloadProfile(
      groupId,
      sprintId,
      contributor,
    );
    const inputHash = hashProfile(profile);

    const cached = await getCachedSummary({
      groupId,
      sprintId,
      kind: "contributor",
      contributorKey: contributor,
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

    const prompt = buildContributorSummaryPrompt(profile);
    console.log(`[contributor prompt: ${contributor}]\n`, prompt);
    const generated = await generateContributionSummaryText(prompt);
    console.log(`[contributor summary: ${contributor}]`, generated.text);

    await upsertCachedSummary({
      groupId,
      sprintId,
      kind: "contributor",
      contributorKey: contributor,
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
    console.error("Error generating contributor summary:", error);
    return mapErrorToResponse(error);
  }
}
