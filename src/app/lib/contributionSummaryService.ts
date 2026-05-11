import { createHash } from "node:crypto";
import mongoose from "mongoose";
import {
  Commit,
  ContributionSummary,
  Group,
  Issue,
  PullRequest,
  Sprint,
  SprintTask,
} from "@/app/lib/models";

// Core logic to build workload profiles and summaries for teams and contributors based on their sprint activity.
export type ContributorWorkload = {
  name: string;
  commits: number;
  prsOpened: number;
  prsMerged: number;
  issuesOpened: number;
  issuesClosed: number;
  tasksAssigned: number;
  tasksDone: number;
  filesChangedTotal: number;
  activeDays: number;
  commitTypes: Record<string, number>;
  recentPrTitles: string[];
  recentClosedIssueTitles: string[];
  total: number;
};

// The full profile of a team's work during a sprint, used to generate the team summary.
export type TeamWorkloadProfile = {
  sprint: { id: string; name: string; startDate: string; endDate: string };
  group: { id: string; name: string };
  totals: {
    commits: number;
    prsOpened: number;
    prsMerged: number;
    issuesOpened: number;
    issuesClosed: number;
    tasksDone: number;
  };
  highlights: {
    recentMergedPrTitles: string[];
    recentClosedIssueTitles: string[];
  };
  contributors: ContributorWorkload[];
};

// The profile of an individual contributor's work during a sprint, used to generate the contributor summary.
export type ContributorWorkloadProfile = {
  sprint: { id: string; name: string; startDate: string; endDate: string };
  contributor: ContributorWorkload;
};

export type GeneratedSummary = {
  text: string;
  provider: "openai" | "gemini";
  model: string;
};

export class ContributionSummaryAiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContributionSummaryAiError";
  }
}

const KNOWN_COMMIT_TYPES = new Set([
  "feat",
  "fix",
  "refactor",
  "docs",
  "test",
  "chore",
  "style",
  "perf",
  "build",
  "ci",
]);

const RECENT_TITLES_PER_CONTRIBUTOR = 5;
const RECENT_TITLES_PER_TEAM = 8;
const TITLE_MAX_CHARS = 100;

function truncateTitle(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  const firstLine = text.split(/\r?\n/)[0].trim();
  if (firstLine.length <= TITLE_MAX_CHARS) return firstLine;
  return `${firstLine.slice(0, TITLE_MAX_CHARS - 3)}...`;
}

function normalizeAuthorName(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return "unknown";
}

function toIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

function dayKey(value: unknown): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function classifyCommitType(message: string): string {
  const match = message
    .trim()
    .toLowerCase()
    .match(/^([a-z]+)(\([^)]*\))?!?:/);
  if (!match) return "other";
  return KNOWN_COMMIT_TYPES.has(match[1]) ? match[1] : "other";
}

function emptyWorkload(name: string): ContributorWorkload {
  return {
    name,
    commits: 0,
    prsOpened: 0,
    prsMerged: 0,
    issuesOpened: 0,
    issuesClosed: 0,
    tasksAssigned: 0,
    tasksDone: 0,
    filesChangedTotal: 0,
    activeDays: 0,
    commitTypes: {},
    recentPrTitles: [],
    recentClosedIssueTitles: [],
    total: 0,
  };
}

// Deterministic JSON stringify so the SHA-256 cache key is stable regardless
// of the insertion order of object keys.
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const obj = value as Record<string, unknown>;
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

export function hashProfile(profile: object): string {
  return createHash("sha256").update(stableStringify(profile)).digest("hex");
}

export async function buildTeamWorkloadProfile(
  groupId: string,
  sprintId: string,
): Promise<TeamWorkloadProfile> {
  if (
    !mongoose.isValidObjectId(groupId) ||
    !mongoose.isValidObjectId(sprintId)
  ) {
    throw new Error("Invalid group or sprint id");
  }

  const gid = new mongoose.Types.ObjectId(groupId);
  const sid = new mongoose.Types.ObjectId(sprintId);

  const [group, sprint] = await Promise.all([
    Group.findById(gid).lean(),
    Sprint.findOne({ _id: sid, group: gid }).lean(),
  ]);

  if (!group) throw new Error("Group not found");
  if (!sprint) throw new Error("Sprint not found");

  const start = new Date(sprint.startDate as Date);
  const end = new Date(sprint.endDate as Date);

  // // Fetch all relevant data within the sprint date range
  const [
    commits,
    issuesOpened,
    issuesClosed,
    pullRequestsOpened,
    pullRequestsMerged,
    sprintTasks,
  ] = await Promise.all([
    Commit.find({ group: gid, date: { $gte: start, $lte: end } })
      .sort({ date: -1 })
      .lean(),
    Issue.find({
      group: gid,
      createdAt: { $gte: start, $lte: end },
    })
      .sort({ createdAt: -1 })
      .lean(),
    Issue.find({
      group: gid,
      state: "CLOSED",
      closedAt: { $gte: start, $lte: end },
    })
      .sort({ closedAt: -1 })
      .lean(),
    PullRequest.find({
      group: gid,
      createdAt: { $gte: start, $lte: end },
    })
      .sort({ createdAt: -1 })
      .lean(),
    PullRequest.find({
      group: gid,
      state: "MERGED",
      mergedAt: { $gte: start, $lte: end },
    })
      .sort({ mergedAt: -1 })
      .lean(),
    SprintTask.find({ group: gid, sprint: sid }).lean(),
  ]);

  const map = new Map<string, ContributorWorkload>();
  const dayTracker = new Map<string, Set<string>>();

  const ensure = (name: string) => {
    if (!map.has(name)) {
      map.set(name, emptyWorkload(name));
    }
    return map.get(name) as ContributorWorkload;
  };

  const trackDay = (name: string, value: unknown) => {
    const key = dayKey(value);
    if (!key) return;
    if (!dayTracker.has(name)) {
      dayTracker.set(name, new Set());
    }
    dayTracker.get(name)?.add(key);
  };

  // Process commits
  for (const commit of commits) {
    const name = normalizeAuthorName(
      (commit.author as { name?: unknown })?.name,
    );
    const c = ensure(name);
    c.commits += 1;
    c.filesChangedTotal += Number(commit.filesChanged ?? 0);
    c.total += 1;
    const type = classifyCommitType(String(commit.message ?? ""));
    c.commitTypes[type] = (c.commitTypes[type] ?? 0) + 1;
    trackDay(name, commit.date);
  }

  // Process opened issues
  for (const issue of issuesOpened) {
    const name = normalizeAuthorName(issue.author);
    const c = ensure(name);
    c.issuesOpened += 1;
    c.total += 1;
    trackDay(name, issue.createdAt);
  }

  // Process closed issues
  for (const issue of issuesClosed) {
    const name = normalizeAuthorName(issue.author);
    const c = ensure(name);
    c.issuesClosed += 1;
    c.total += 1;
    trackDay(name, issue.closedAt);
    if (c.recentClosedIssueTitles.length < RECENT_TITLES_PER_CONTRIBUTOR) {
      const title = truncateTitle(issue.title);
      if (title) c.recentClosedIssueTitles.push(title);
    }
  }

  // Process opened pull requests
  for (const pr of pullRequestsOpened) {
    const name = normalizeAuthorName(pr.author);
    const c = ensure(name);
    c.prsOpened += 1;
    c.total += 1;
    trackDay(name, pr.createdAt);
    if (c.recentPrTitles.length < RECENT_TITLES_PER_CONTRIBUTOR) {
      const title = truncateTitle(pr.title);
      if (title) c.recentPrTitles.push(title);
    }
  }

  // Process merged pull requests
  for (const pr of pullRequestsMerged) {
    const name = normalizeAuthorName(pr.author);
    const c = ensure(name);
    c.prsMerged += 1;
    c.total += 1;
    trackDay(name, pr.mergedAt);
  }

  // Process sprint tasks
  for (const task of sprintTasks) {
    for (const assignee of task.assignees ?? []) {
      const name = normalizeAuthorName(assignee);
      const c = ensure(name);
      c.tasksAssigned += 1;
      c.total += 1;
      if (task.status === "DONE") {
        c.tasksDone += 1;
      }
    }
  }

  for (const [name, days] of dayTracker.entries()) {
    const c = map.get(name);
    if (c) c.activeDays = days.size;
  }

  const contributors = Array.from(map.values()).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.name.localeCompare(b.name);
  });

  const recentMergedPrTitles = pullRequestsMerged
    .slice(0, RECENT_TITLES_PER_TEAM)
    .map((pr) => truncateTitle(pr.title))
    .filter((title): title is string => Boolean(title));

  const recentClosedIssueTitles = issuesClosed
    .slice(0, RECENT_TITLES_PER_TEAM)
    .map((issue) => truncateTitle(issue.title))
    .filter((title): title is string => Boolean(title));

  // LOG FOR DEBUGGING - REMOVE LATER
  console.log(
    "[team profile]",
    JSON.stringify(
      {
        sprint: {
          name: sprint.name,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
        },
        totals: {
          commits: commits.length,
          prsOpened: pullRequestsOpened.length,
          prsMerged: pullRequestsMerged.length,
          issuesOpened: issuesOpened.length,
          issuesClosed: issuesClosed.length,
        },
        highlights: { recentMergedPrTitles, recentClosedIssueTitles },
        contributors,
      },
      null,
      2,
    ),
  );

  return {
    sprint: {
      id: String(sprint._id),
      name: String(sprint.name ?? "Unnamed Sprint"),
      startDate: toIsoDate(sprint.startDate),
      endDate: toIsoDate(sprint.endDate),
    },
    group: {
      id: String(group._id),
      name: String(group.name ?? "Unnamed Group"),
    },
    totals: {
      commits: commits.length,
      prsOpened: pullRequestsOpened.length,
      prsMerged: pullRequestsMerged.length,
      issuesOpened: issuesOpened.length,
      issuesClosed: issuesClosed.length,
      tasksDone: sprintTasks.filter((t) => t.status === "DONE").length,
    },
    highlights: {
      recentMergedPrTitles,
      recentClosedIssueTitles,
    },
    contributors,
  };
}

// build a workload profile for a specific contributor by filtering the team profile
export async function buildContributorWorkloadProfile(
  groupId: string,
  sprintId: string,
  contributorName: string,
): Promise<ContributorWorkloadProfile> {
  const team = await buildTeamWorkloadProfile(groupId, sprintId);
  const target = team.contributors.find((c) => c.name === contributorName);
  if (!target) {
    throw new Error("Contributor not found in this sprint");
  }
  return {
    sprint: team.sprint,
    contributor: target,
  };
}

// builds the prompt for generating a team-level summary.
export function buildTeamSummaryPrompt(profile: TeamWorkloadProfile): string {
  return [
    "You are summarising what a software team built during a sprint.",
    "Write a factual 2-3 sentence summary focused on the WORK, not rankings.",
    "Use the PR titles and closed-issue titles in 'highlights' to identify",
    "the main themes of the sprint (e.g. 'sync pipeline fixes', 'auth",
    "refactor', 'UI polish'). Group similar titles into 2-3 themes.",
    "Then describe what each active contributor focused on, drawing from",
    "their recentPrTitles and recentClosedIssueTitles. Frame this as 'X",
    "worked on Y' or 'X focused on A and B'.",
    "Cite concrete work themes and project areas; do not invent any.",
    "Return plain text only, no headings, no bullets, no markdown.",
    "Aim for 200-300 characters. Do not stop mid-sentence.",
    "",
    "Sprint workload (JSON):",
    JSON.stringify(profile, null, 2),
  ].join("\n");
}

// builds the prompt for generating a contributor-level summary.
export function buildContributorSummaryPrompt(
  profile: ContributorWorkloadProfile,
): string {
  return [
    "You are summarising what one contributor worked on during a sprint.",
    "Write a factual 2 or 3 sentence summary focused on the WORK they did.",
    "Use 'recentPrTitles' and 'recentClosedIssueTitles' to identify themes",
    "of their work (e.g. 'database migrations', 'frontend polish',",
    "'GitHub sync correctness'). Group similar titles into themes.",
    "Describe the type of work using commitTypes (mostly features, mostly",
    "fixes, mix of refactors, etc.) when it adds insight.",
    "Do NOT compare them to teammates. Do NOT mention rankings.",
    "Do not say 'top contributor', 'most active', or anything ranking-related.",
    "Cite concrete themes; do not invent work that isn't in the titles.",
    "Return plain text only, no headings or bullets.",
    "Aim for 100-200 characters. Do not stop mid-sentence.",
    "",
    "Contributor workload (JSON):",
    JSON.stringify(profile, null, 2),
  ].join("\n");
}

// helper to parse the content field from OpenAI responses, which can be a string or an array of text/objects.
function parseOpenAiContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (
        part &&
        typeof part === "object" &&
        "type" in part &&
        "text" in part &&
        (part as { type?: string }).type === "text"
      ) {
        return String((part as { text?: unknown }).text ?? "");
      }
      return "";
    })
    .join("\n")
    .trim();
}

// calls the OpenAI or Gemini API to generate a summary based on the prompt, depending on which API key is configured.
async function generateWithOpenAi(prompt: string): Promise<GeneratedSummary> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    throw new ContributionSummaryAiError("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You produce concise, factual contributor workload summaries based on structured data.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new ContributionSummaryAiError(
      `OpenAI request failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: { content?: unknown };
      finish_reason?: string;
    }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };

  console.log("[openai finish_reason]", payload.choices?.[0]?.finish_reason);
  console.log("[openai usage]", payload.usage);

  const text = parseOpenAiContent(payload.choices?.[0]?.message?.content);
  if (!text) {
    throw new ContributionSummaryAiError("OpenAI returned an empty summary");
  }

  return { text, provider: "openai", model };
}

async function generateWithGemini(prompt: string): Promise<GeneratedSummary> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

  if (!apiKey) {
    throw new ContributionSummaryAiError("GEMINI_API_KEY is not configured");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 5000 },
    }),
  });

  if (!response.ok) {
    throw new ContributionSummaryAiError(
      `Gemini request failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    throw new ContributionSummaryAiError("Gemini returned an empty summary");
  }

  return { text, provider: "gemini", model };
}

export async function generateContributionSummaryText(
  prompt: string,
): Promise<GeneratedSummary> {
  if (process.env.OPENAI_API_KEY) {
    return generateWithOpenAi(prompt);
  }
  if (process.env.GEMINI_API_KEY) {
    return generateWithGemini(prompt);
  }
  throw new ContributionSummaryAiError(
    "No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY.",
  );
}

type CachedSummary = {
  summary: string;
  inputHash: string;
  generatedAt: Date;
  model: string;
  provider: "openai" | "gemini";
};

// retrieves a cached summary from the database if it exists for the given group, sprint, kind, and contributorKey.
export async function getCachedSummary(args: {
  groupId: string;
  sprintId: string;
  kind: "team" | "contributor";
  contributorKey: string | null;
}): Promise<CachedSummary | null> {
  const row = await ContributionSummary.findOne({
    group: new mongoose.Types.ObjectId(args.groupId),
    sprint: new mongoose.Types.ObjectId(args.sprintId),
    kind: args.kind,
    contributorKey: args.contributorKey,
  }).lean();
  if (!row) return null;
  return {
    summary: String(row.summary),
    inputHash: String(row.inputHash),
    generatedAt: new Date(row.generatedAt),
    model: String(row.model),
    provider: row.provider as "openai" | "gemini",
  };
}

// inserts or updates a cached summary in the database for the given group, sprint, kind, and contributorKey.
export async function upsertCachedSummary(args: {
  groupId: string;
  sprintId: string;
  kind: "team" | "contributor";
  contributorKey: string | null;
  summary: string;
  inputHash: string;
  model: string;
  provider: "openai" | "gemini";
}): Promise<void> {
  await ContributionSummary.findOneAndUpdate(
    {
      group: new mongoose.Types.ObjectId(args.groupId),
      sprint: new mongoose.Types.ObjectId(args.sprintId),
      kind: args.kind,
      contributorKey: args.contributorKey,
    },
    {
      $set: {
        summary: args.summary,
        inputHash: args.inputHash,
        model: args.model,
        provider: args.provider,
        generatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}
