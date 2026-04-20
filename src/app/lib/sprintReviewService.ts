import mongoose from "mongoose";
import {
  Commit,
  Group,
  Issue,
  PullRequest,
  Sprint,
  User,
} from "@/app/lib/models";
import { normalizeUserRefString } from "@/app/lib/userRef";

const MAX_RECENT_ITEMS = 8;
const MAX_CONTRIBUTORS = 10;

type SprintReviewContributor = {
  name: string;
  commits: number;
  issuesOpened: number;
  issuesClosed: number;
  pullRequestsOpened: number;
  pullRequestsMerged: number;
  total: number;
};

type SprintReviewMember = {
  id: string;
  name: string;
  email: string | null;
};

export type SprintReviewAggregate = {
  sprint: {
    id: string;
    name: string;
    status: string;
    goal: string | null;
    isCurrent: boolean;
    startDate: string;
    endDate: string;
  };
  group: {
    id: string;
    name: string;
    description: string;
    repoOwner: string | null;
    repoName: string | null;
  };
  members: SprintReviewMember[];
  metrics: {
    commitCount: number;
    issuesOpened: number;
    issuesClosed: number;
    pullRequestsOpened: number;
    pullRequestsMerged: number;
  };
  topContributors: SprintReviewContributor[];
  highlights: {
    recentCommits: Array<{
      sha: string;
      message: string;
      author: string;
      date: string;
    }>;
    recentIssuesOpened: Array<{
      number: number;
      title: string;
      author: string;
      createdAt: string;
    }>;
    recentIssuesClosed: Array<{
      number: number;
      title: string;
      author: string;
      closedAt: string;
    }>;
    recentPullRequestsOpened: Array<{
      number: number;
      title: string;
      author: string;
      createdAt: string;
    }>;
    recentPullRequestsMerged: Array<{
      number: number;
      title: string;
      author: string;
      mergedAt: string;
    }>;
  };
};

export type GeneratedSprintReview = {
  text: string;
  provider: "openai" | "gemini";
  model: string;
};

export class SprintReviewAiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SprintReviewAiError";
  }
}

function normalizeAuthorName(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "unknown";
}

function toIsoDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString();
}

function truncateText(value: unknown, maxLength = 160): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return "No message";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

function upsertContributor(
  map: Map<string, SprintReviewContributor>,
  name: string,
) {
  if (!map.has(name)) {
    map.set(name, {
      name,
      commits: 0,
      issuesOpened: 0,
      issuesClosed: 0,
      pullRequestsOpened: 0,
      pullRequestsMerged: 0,
      total: 0,
    });
  }

  return map.get(name) as SprintReviewContributor;
}

function parseOpenAiContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const joined = content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

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

  return joined;
}

export async function aggregateSprintReviewData(
  groupId: string,
  sprintId: string,
): Promise<SprintReviewAggregate> {
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

  if (!group) {
    throw new Error("Group not found");
  }

  if (!sprint) {
    throw new Error("Sprint not found");
  }

  const start = new Date(sprint.startDate as Date);
  const end = new Date(sprint.endDate as Date);

  const [
    commits,
    issuesOpened,
    issuesClosed,
    pullRequestsOpened,
    pullRequestsMerged,
  ] = await Promise.all([
    Commit.find({
      group: gid,
      date: { $gte: start, $lte: end },
    })
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
  ]);

  const normalizedMemberIds: Array<string | null> = (group.members ?? []).map(
    (member: unknown): string | null => normalizeUserRefString(member),
  );

  const memberIds: string[] = Array.from(
    new Set(
      normalizedMemberIds.filter((value: string | null): value is string =>
        Boolean(value),
      ),
    ),
  );

  const membersById = new Map<
    string,
    { name?: string | null; email?: string | null }
  >();

  if (memberIds.length > 0) {
    const users = await User.find({
      _id: {
        $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    })
      .select({ name: 1, email: 1 })
      .lean();

    for (const user of users) {
      membersById.set(String(user._id), {
        name: typeof user.name === "string" ? user.name : null,
        email: typeof user.email === "string" ? user.email : null,
      });
    }
  }

  const members = memberIds.map((id) => {
    const found = membersById.get(id);
    return {
      id,
      name: found?.name?.trim() || id,
      email: found?.email ?? null,
    };
  });

  const contributorMap = new Map<string, SprintReviewContributor>();

  for (const commit of commits) {
    const name = normalizeAuthorName(
      (commit.author as { name?: unknown })?.name,
    );
    const contributor = upsertContributor(contributorMap, name);
    contributor.commits += 1;
    contributor.total += 1;
  }

  for (const issue of issuesOpened) {
    const name = normalizeAuthorName(issue.author);
    const contributor = upsertContributor(contributorMap, name);
    contributor.issuesOpened += 1;
    contributor.total += 1;
  }

  for (const issue of issuesClosed) {
    const name = normalizeAuthorName(issue.author);
    const contributor = upsertContributor(contributorMap, name);
    contributor.issuesClosed += 1;
    contributor.total += 1;
  }

  for (const pullRequest of pullRequestsOpened) {
    const name = normalizeAuthorName(pullRequest.author);
    const contributor = upsertContributor(contributorMap, name);
    contributor.pullRequestsOpened += 1;
    contributor.total += 1;
  }

  for (const pullRequest of pullRequestsMerged) {
    const name = normalizeAuthorName(pullRequest.author);
    const contributor = upsertContributor(contributorMap, name);
    contributor.pullRequestsMerged += 1;
    contributor.total += 1;
  }

  const topContributors = Array.from(contributorMap.values())
    .sort((a, b) => {
      if (b.total !== a.total) {
        return b.total - a.total;
      }
      return a.name.localeCompare(b.name);
    })
    .slice(0, MAX_CONTRIBUTORS);

  return {
    sprint: {
      id: String(sprint._id),
      name: String(sprint.name || "Unnamed Sprint"),
      status: String(sprint.status || "UNKNOWN"),
      goal: typeof sprint.goal === "string" ? sprint.goal : null,
      isCurrent: Boolean(sprint.isCurrent),
      startDate: toIsoDate(sprint.startDate),
      endDate: toIsoDate(sprint.endDate),
    },
    group: {
      id: String(group._id),
      name: String(group.name || "Unnamed Group"),
      description: String(group.description || ""),
      repoOwner: typeof group.repoOwner === "string" ? group.repoOwner : null,
      repoName: typeof group.repoName === "string" ? group.repoName : null,
    },
    members,
    metrics: {
      commitCount: commits.length,
      issuesOpened: issuesOpened.length,
      issuesClosed: issuesClosed.length,
      pullRequestsOpened: pullRequestsOpened.length,
      pullRequestsMerged: pullRequestsMerged.length,
    },
    topContributors,
    highlights: {
      recentCommits: commits.slice(0, MAX_RECENT_ITEMS).map((commit) => ({
        sha: String(commit.sha),
        message: truncateText(commit.message),
        author: normalizeAuthorName(
          (commit.author as { name?: unknown })?.name,
        ),
        date: toIsoDate(commit.date),
      })),
      recentIssuesOpened: issuesOpened
        .slice(0, MAX_RECENT_ITEMS)
        .map((issue) => ({
          number: Number(issue.number),
          title: truncateText(issue.title, 120),
          author: normalizeAuthorName(issue.author),
          createdAt: toIsoDate(issue.createdAt),
        })),
      recentIssuesClosed: issuesClosed
        .slice(0, MAX_RECENT_ITEMS)
        .map((issue) => ({
          number: Number(issue.number),
          title: truncateText(issue.title, 120),
          author: normalizeAuthorName(issue.author),
          closedAt: toIsoDate(issue.closedAt),
        })),
      recentPullRequestsOpened: pullRequestsOpened
        .slice(0, MAX_RECENT_ITEMS)
        .map((pullRequest) => ({
          number: Number(pullRequest.number),
          title: truncateText(pullRequest.title, 120),
          author: normalizeAuthorName(pullRequest.author),
          createdAt: toIsoDate(pullRequest.createdAt),
        })),
      recentPullRequestsMerged: pullRequestsMerged
        .slice(0, MAX_RECENT_ITEMS)
        .map((pullRequest) => ({
          number: Number(pullRequest.number),
          title: truncateText(pullRequest.title, 120),
          author: normalizeAuthorName(pullRequest.author),
          mergedAt: toIsoDate(pullRequest.mergedAt),
        })),
    },
  };
}

export function buildSprintReviewPrompt(data: SprintReviewAggregate): string {
  return [
    "You are an engineering manager assistant writing a sprint review.",
    "Use only the provided sprint data and avoid making up facts.",
    "",
    "Return the final response as plain text with exactly these section headings:",
    "1. Sprint Overview",
    "2. Key Contributions",
    "3. Team Activity",
    "4. Observations / Insights",
    "",
    "Requirements:",
    "- Keep the tone neutral and objective.",
    "- Keep each section concise (2-4 bullet points).",
    "- Mention concrete counts where data is available.",
    "- If data is missing, explicitly say data is unavailable.",
    "- Do not mention prompts, JSON, or that you are an AI model.",
    "",
    "Sprint data (JSON):",
    JSON.stringify(data, null, 2),
  ].join("\n");
}

async function generateWithOpenAi(
  prompt: string,
): Promise<GeneratedSprintReview> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    throw new SprintReviewAiError("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You produce concise, objective sprint reviews based on structured data.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new SprintReviewAiError(
      `OpenAI request failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };

  const text = parseOpenAiContent(payload.choices?.[0]?.message?.content);
  if (!text) {
    throw new SprintReviewAiError("OpenAI returned an empty sprint review");
  }

  return {
    text,
    provider: "openai",
    model,
  };
}

async function generateWithGemini(
  prompt: string,
): Promise<GeneratedSprintReview> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

  if (!apiKey) {
    throw new SprintReviewAiError("GEMINI_API_KEY is not configured");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    throw new SprintReviewAiError(
      `Gemini request failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    throw new SprintReviewAiError("Gemini returned an empty sprint review");
  }

  return {
    text,
    provider: "gemini",
    model,
  };
}

export async function generateSprintReviewText(
  prompt: string,
): Promise<GeneratedSprintReview> {
  if (process.env.OPENAI_API_KEY) {
    return generateWithOpenAi(prompt);
  }

  if (process.env.GEMINI_API_KEY) {
    return generateWithGemini(prompt);
  }

  throw new SprintReviewAiError(
    "No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY.",
  );
}
