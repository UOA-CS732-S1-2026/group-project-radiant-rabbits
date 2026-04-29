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
    User.deleteMany({}),
    Issue.deleteMany({}),
    Commit.deleteMany({}),
    PullRequest.deleteMany({}),
  ]);
  jest.clearAllMocks();
});

// Helper function to create a group and user for testing, with optional overrides for project settings
async function createGroupAndUser(
  githubId = "user1",
  overrides?: Partial<{
    projectStartDate: Date;
    projectEndDate: Date;
    sprintLengthWeeks: number;
  }>,
) {
  const group = await Group.create({
    name: "tester",
    description: "tester group",
    inviteCode: "test123",
    members: [githubId],
    createdBy: githubId,
    projectStartDate: overrides?.projectStartDate,
    projectEndDate: overrides?.projectEndDate,
    sprintLengthWeeks: overrides?.sprintLengthWeeks,
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

  // Test 2: test case for user with no group or incomplete sprint settings
  it("should return a clear empty state when no sprint exists", async () => {
    await createGroupAndUser("user1");
    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sprint).toBeNull();
    expect(body.message).toBe(
      "Sprint settings are incomplete. Please set project dates and sprint length.",
    );
  });

  // Test 3: test case for computing the active sprint from the project dates and sprint length
  it("should compute the active sprint from project dates and sprint length", async () => {
    const now = new Date();
    const group = await createGroupAndUser("user1", {
      projectStartDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      projectEndDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      sprintLengthWeeks: 1,
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
    expect(body.sprint?.name).toBe("Sprint 2");
    expect(body.selectionReason).toBe("active");
    expect(body.sprint?.status).toBe("ACTIVE");
    expect(body.metrics?.issuesCreated).toBe(1);
    expect(body.metrics?.commitsCount).toBe(3);
    expect(body.metrics?.pullRequestsOpened).toBe(1);
    expect(body.metrics?.pullRequestsMerged).toBe(1);
    expect(body.metrics?.activeContributors).toBe(2);
    expect(body.metrics?.contributors?.[0]?.name).toBe("Anna");
  });

  // Test 4: test case for returning the latest selection reason when the project is complete
  it("should return the latest selection reason when project is complete", async () => {
    await createGroupAndUser("user1", {
      projectStartDate: new Date("2026-01-01T00:00:00.000Z"),
      projectEndDate: new Date("2026-01-15T00:00:00.000Z"),
      sprintLengthWeeks: 1,
    });
    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sprint?.name).toBe("Sprint 3");
    expect(body.selectionReason).toBe("latest");
  });

  // Test 5: test case for mapping a CLOSED issue to status "Closed" in the metrics output
  it("should map a closed issue to status 'Closed' in metrics.issues", async () => {
    const now = new Date();
    const group = await createGroupAndUser("user1", {
      projectStartDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      projectEndDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      sprintLengthWeeks: 1,
    });

    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    await Issue.create({
      number: 202,
      title: "Closed issue in period",
      state: "CLOSED",
      createdAt: now,
      group: group._id,
      author: "anna",
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.metrics?.issues).toHaveLength(1);
    expect(body.metrics?.issues?.[0]?.number).toBe(202);
    expect(body.metrics?.issues?.[0]?.status).toBe("Closed");
  });
});
