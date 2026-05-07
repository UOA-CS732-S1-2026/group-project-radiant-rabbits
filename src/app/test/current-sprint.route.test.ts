/**
 * @jest-environment node
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import {
  Commit,
  Group,
  Issue,
  PullRequest,
  Sprint,
  SprintTask,
  User,
} from "@/app/lib/models";
import { GET } from "../api/groups/current/current-sprint/route";

// Create mocks for all dependencies used in the route handler
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

let mongoServer: MongoMemoryServer;

// Connect to MongoDB before running tests, and disconnect afterwards
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "test-current-sprint-route",
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear all mocks before each test to ensure test isolation
afterEach(async () => {
  await Promise.all([
    Group.deleteMany({}),
    Sprint.deleteMany({}),
    SprintTask.deleteMany({}),
    User.deleteMany({}),
    Issue.deleteMany({}),
    Commit.deleteMany({}),
    PullRequest.deleteMany({}),
  ]);
  jest.clearAllMocks();
});

// Helper to create a group and user with the given group as the user's currentGroupId
async function createGroupAndUser(githubId = "user1") {
  const group = await Group.create({
    name: "tester",
    description: "tester group",
    inviteCode: `test-${Date.now()}-${Math.random()}`,
    members: [githubId],
    createdBy: githubId,
  });

  await User.create({
    githubId,
    login: githubId,
    name: "Test User",
    email: `${githubId}@example.com`,
    currentGroupId: group._id,
  });

  return group;
}

// Describe the test suite for the current sprint route
describe("GET /api/groups/current/current-sprint", () => {
  // Test 1: test case for unauthenticated user
  it("should return 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Authentication required" });
  });

  // Test 2: empty state when no Sprint docs exist for the group
  it("should return a clear empty state when no sprint exists", async () => {
    await createGroupAndUser("user1");
    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sprint).toBeNull();
    // iterationFieldConfigured is null here, so we get the "no iterations
    // created yet" message instead of the "set up" one.
    expect(body.message).toMatch(/No iterations created yet/i);
  });

  // Test 3: resolves the active sprint from the synced Sprint doc and aggregates activity in its window
  it("should resolve the active sprint from synced iterations and aggregate activity", async () => {
    const now = new Date();
    const group = await createGroupAndUser("user1");
    const sprintStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sprintEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    await Sprint.create({
      group: group._id,
      iterationId: "iter_active",
      name: "Sprint Active",
      startDate: sprintStart,
      endDate: sprintEnd,
      status: "ACTIVE",
      isCurrent: true,
    });

    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    await Issue.create({
      number: 101,
      title: "Issue in period",
      state: "OPEN",
      createdAt: now,
      group: group._id,
      author: "anna",
    });

    await Commit.create([
      {
        sha: "a1",
        message: "feat: one",
        author: { name: "Anna" },
        date: now,
        group: group._id,
      },
      {
        sha: "a2",
        message: "feat: two",
        author: { name: "Anna" },
        date: now,
        group: group._id,
      },
      {
        sha: "b1",
        message: "fix: one",
        author: { name: "Ben" },
        date: now,
        group: group._id,
      },
    ]);

    await PullRequest.create({
      number: 55,
      title: "PR in period",
      state: "MERGED",
      createdAt: now,
      mergedAt: now,
      group: group._id,
      author: "anna",
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sprint?.name).toBe("Sprint Active");
    expect(body.selectionReason).toBe("active");
    expect(body.sprint?.status).toBe("ACTIVE");
    expect(body.metrics?.issuesCreated).toBe(1);
    expect(body.metrics?.commitsCount).toBe(3);
    expect(body.metrics?.pullRequestsOpened).toBe(1);
    expect(body.metrics?.pullRequestsMerged).toBe(1);
    expect(body.metrics?.activeContributors).toBe(2);
    expect(body.metrics?.contributors?.[0]?.name).toBe("Anna");
  });

  // Test 4: when no sprint is currently active, fall back to the latest one
  it("should fall back to the latest sprint when none is current", async () => {
    const group = await createGroupAndUser("user1");

    await Sprint.create([
      {
        group: group._id,
        iterationId: "iter_old",
        name: "Sprint Old",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-01-14T23:59:59.999Z"),
        status: "COMPLETED",
        isCurrent: false,
      },
      {
        group: group._id,
        iterationId: "iter_recent",
        name: "Sprint Recent",
        startDate: new Date("2026-01-15T00:00:00.000Z"),
        endDate: new Date("2026-01-28T23:59:59.999Z"),
        status: "COMPLETED",
        isCurrent: false,
      },
    ]);

    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sprint?.name).toBe("Sprint Recent");
    expect(body.selectionReason).toBe("latest");
  });

  // Test 5: SprintTasks linked to the resolved sprint show up in metrics.tasks with a 3-state breakdown
  it("should include linked SprintTasks and their breakdown in metrics", async () => {
    const now = new Date();
    const group = await createGroupAndUser("user1");
    const sprintStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sprintEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const sprint = await Sprint.create({
      group: group._id,
      iterationId: "iter_active",
      name: "Sprint Active",
      startDate: sprintStart,
      endDate: sprintEnd,
      status: "ACTIVE",
      isCurrent: true,
    });

    await SprintTask.create([
      {
        title: "Set up CI",
        status: "DONE",
        assignees: ["anna"],
        issueNumber: 5,
        sprint: sprint._id,
        group: group._id,
      },
      {
        title: "Write tests",
        status: "IN_PROGRESS",
        assignees: ["ben"],
        issueNumber: 6,
        sprint: sprint._id,
        group: group._id,
      },
      {
        title: "Plan release",
        status: "TODO",
        assignees: [],
        issueNumber: 7,
        sprint: sprint._id,
        group: group._id,
      },
      // Backlog task — not linked to this sprint, must be excluded
      {
        title: "Backlog item",
        status: "TODO",
        assignees: [],
        issueNumber: 999,
        sprint: null,
        group: group._id,
      },
    ]);

    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.metrics?.tasks).toHaveLength(3);
    expect(body.metrics?.taskBreakdown).toEqual({
      todo: 1,
      inProgress: 1,
      done: 1,
    });
    expect(
      body.metrics?.tasks
        ?.map((t: { issueNumber: number }) => t.issueNumber)
        .sort(),
    ).toEqual([5, 6, 7]);
  });
});
