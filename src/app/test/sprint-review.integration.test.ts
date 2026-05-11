import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import {
  Commit,
  Group,
  Issue,
  PullRequest,
  Sprint,
  User,
} from "@/app/lib/models";
import { normalizeUserRef } from "@/app/lib/userRef";
import { POST } from "../api/groups/[groupId]/sprints/[sprintId]/review/route";

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock(
  "@/app/api/auth/[...nextauth]/options",
  () => ({
    options: {},
  }),
  { virtual: true },
);

jest.mock("@/app/lib/mongodbConnection", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockGetServerSession = getServerSession as unknown as jest.MockedFunction<
  () => Promise<{
    user?: {
      id?: string;
    };
  } | null>
>;

const mockFetch = jest.fn();
const originalFetch = global.fetch;

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "test-sprint-review-integration",
  });
});

afterAll(async () => {
  global.fetch = originalFetch;
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch as unknown as typeof fetch;

  process.env.OPENAI_API_KEY = "test-openai-key";
  process.env.OPENAI_MODEL = "gpt-4o-mini";
  delete process.env.GEMINI_API_KEY;
});

afterEach(async () => {
  await Promise.all([
    Commit.deleteMany({}),
    Issue.deleteMany({}),
    PullRequest.deleteMany({}),
    Sprint.deleteMany({}),
    Group.deleteMany({}),
    User.deleteMany({}),
  ]);
});

async function seedSprintReviewData() {
  const user1Id = normalizeUserRef("user1");
  const user2Id = normalizeUserRef("user2");

  if (!user1Id || !user2Id) {
    throw new Error("Failed to create user object IDs");
  }

  await User.create({
    _id: user1Id,
    githubId: "user1",
    login: "alice",
    name: "Alice",
    email: "alice@example.com",
  });

  await User.create({
    _id: user2Id,
    githubId: "user2",
    login: "bob",
    name: "Bob",
    email: "bob@example.com",
  });

  const group = await Group.create({
    name: "Radiant Rabbits",
    description: "Sprint review integration test group",
    inviteCode: "AIREVIEW",
    members: ["user1", "user2"],
    createdBy: "user1",
    repoOwner: "UOA-CS732-S1-2026",
    repoName: "group-project-radiant-rabbits",
  });

  const sprint = await Sprint.create({
    group: group._id,
    name: "Sprint 9",
    startDate: new Date("2026-04-01T00:00:00.000Z"),
    endDate: new Date("2026-04-14T23:59:59.000Z"),
    status: "ACTIVE",
    isCurrent: true,
  });

  await Commit.insertMany([
    {
      group: group._id,
      sha: "seedc1",
      message: "Implement review endpoint",
      author: { name: "Alice", email: "alice@example.com" },
      date: new Date("2026-04-03T10:00:00.000Z"),
    },
    {
      group: group._id,
      sha: "seedc2",
      message: "Add summary UI updates",
      author: { name: "Bob", email: "bob@example.com" },
      date: new Date("2026-04-04T10:00:00.000Z"),
    },
    {
      group: group._id,
      sha: "seedc3",
      message: "Improve tests",
      author: { name: "Alice", email: "alice@example.com" },
      date: new Date("2026-04-05T10:00:00.000Z"),
    },
    {
      group: group._id,
      sha: "seedc4",
      message: "Outside sprint commit",
      author: { name: "Alice", email: "alice@example.com" },
      date: new Date("2026-03-01T10:00:00.000Z"),
    },
  ]);

  await Issue.insertMany([
    {
      group: group._id,
      number: 5001,
      title: "Wire review route",
      state: "CLOSED",
      createdAt: new Date("2026-04-02T08:00:00.000Z"),
      closedAt: new Date("2026-04-07T08:00:00.000Z"),
      author: "Alice",
    },
    {
      group: group._id,
      number: 5002,
      title: "Design prompt output",
      state: "OPEN",
      createdAt: new Date("2026-04-06T08:00:00.000Z"),
      author: "Bob",
    },
    {
      group: group._id,
      number: 5003,
      title: "Outside sprint issue",
      state: "CLOSED",
      createdAt: new Date("2026-03-01T08:00:00.000Z"),
      closedAt: new Date("2026-03-05T08:00:00.000Z"),
      author: "Alice",
    },
  ]);

  await PullRequest.insertMany([
    {
      group: group._id,
      number: 6001,
      title: "Add AI review route",
      state: "MERGED",
      createdAt: new Date("2026-04-05T12:00:00.000Z"),
      mergedAt: new Date("2026-04-06T12:00:00.000Z"),
      author: "Alice",
    },
    {
      group: group._id,
      number: 6002,
      title: "Add regenerate button",
      state: "OPEN",
      createdAt: new Date("2026-04-07T12:00:00.000Z"),
      author: "Bob",
    },
    {
      group: group._id,
      number: 6003,
      title: "Outside sprint PR",
      state: "MERGED",
      createdAt: new Date("2026-03-01T12:00:00.000Z"),
      mergedAt: new Date("2026-03-02T12:00:00.000Z"),
      author: "Alice",
    },
  ]);

  return { group, sprint };
}

describe("Sprint review integration with seeded database data", () => {
  it("generates and persists review from seeded DB activity and returns cached review on second call", async () => {
    const { group, sprint } = await seedSprintReviewData();
    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                "Sprint Overview\n- Team shipped review generation.\n\nKey Contributions\n- Alice led backend work.",
            },
          },
        ],
      }),
    } as Response);

    const firstResponse = await POST(
      new Request(
        `http://localhost/api/groups/${group._id.toString()}/sprints/${sprint._id.toString()}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regenerate: false }),
        },
      ),
      {
        params: Promise.resolve({
          groupId: group._id.toString(),
          sprintId: sprint._id.toString(),
        }),
      },
    );

    const firstBody = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstBody.cached).toBe(false);
    expect(firstBody.provider).toBe("openai");
    expect(firstBody.model).toBe("gpt-4o-mini");
    expect(firstBody.review).toContain("Sprint Overview");
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const openAiRequest = JSON.parse(
      String(mockFetch.mock.calls[0]?.[1]?.body ?? "{}"),
    ) as {
      model?: string;
      messages?: Array<{ content?: string }>;
    };

    expect(openAiRequest.model).toBe("gpt-4o-mini");
    expect(openAiRequest.messages?.[1]?.content).toContain('"commitCount": 3');
    expect(openAiRequest.messages?.[1]?.content).toContain('"issuesOpened": 2');
    expect(openAiRequest.messages?.[1]?.content).toContain(
      '"pullRequestsMerged": 1',
    );

    const savedSprint = await Sprint.findById(sprint._id);
    expect(savedSprint?.aiReview?.text).toContain("Sprint Overview");
    expect(savedSprint?.aiReview?.provider).toBe("openai");

    const secondResponse = await POST(
      new Request(
        `http://localhost/api/groups/${group._id.toString()}/sprints/${sprint._id.toString()}/review`,
        {
          method: "POST",
        },
      ),
      {
        params: Promise.resolve({
          groupId: group._id.toString(),
          sprintId: sprint._id.toString(),
        }),
      },
    );

    const secondBody = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondBody.cached).toBe(true);
    expect(secondBody.review).toContain("Sprint Overview");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
