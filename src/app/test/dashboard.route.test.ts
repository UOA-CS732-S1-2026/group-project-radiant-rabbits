import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { GET } from "@/app/api/groups/[groupId]/dashboard/route";
import { Commit, Group, Issue, PullRequest, Sprint } from "@/app/lib/models";

// Create a mock for all dependencies used in the route handler
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/app/lib/mongodbConnection", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/app/api/auth/[...nextauth]/options", () => ({
  options: {},
}));

jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
  }));
});

// Define the mocked functions with proper types
const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

let mongoServer: MongoMemoryServer;

// Connect to MongoDB before running tests, and disconnect afterwards
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "test" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Promise.all([
    Group.deleteMany({}),
    Commit.deleteMany({}),
    PullRequest.deleteMany({}),
    Issue.deleteMany({}),
    Sprint.deleteMany({}),
  ]);
  jest.clearAllMocks();
});

// Helper to build a NextRequest with optional query params
function makeRequest(
  groupId: string,
  query: Record<string, string> = {},
): NextRequest {
  const url = new URL(`http://localhost/api/groups/${groupId}/dashboard`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

// Helper to create a group with required fields
async function createGroup(members: string[] = ["user1"]) {
  return Group.create({
    name: "Test",
    description: "Test group",
    inviteCode: `inv-${Date.now()}-${Math.random()}`,
    members,
    createdBy: members[0] || "user1",
  });
}

// Describe the test suite for authentication and authorisation scenarios
describe("GET /api/groups/:groupId/dashboard — auth", () => {
  // Test 1: test case for unauthenticated user
  it("should return 401 if not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const group = await createGroup();
    const request = makeRequest(group._id.toString());
    const response = await GET(request, {
      params: Promise.resolve({ groupId: group._id.toString() }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  // Test 2: test case for non-existent group
  it("should return 404 if group does not exist", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const fakeId = new mongoose.Types.ObjectId().toString();
    const request = makeRequest(fakeId);
    const response = await GET(request, {
      params: Promise.resolve({ groupId: fakeId }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Group not found");
  });

  // Test 3: test case for user who is not a member of the group
  it("should return 403 if user is not a member", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "outsider" } });

    const group = await createGroup(["user1"]);
    const request = makeRequest(group._id.toString());
    const response = await GET(request, {
      params: Promise.resolve({ groupId: group._id.toString() }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("You are not a member of this group");
  });
});

// Describe the test suite for successful data retrieval and aggregation
describe("GET /api/groups/:groupId/dashboard — success", () => {
  // Test 1: test case for successful data retrieval with correct shape
  it("should return aggregated data with correct shape", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const group = await createGroup();
    const gid = group._id;

    // Seed data
    await Commit.insertMany([
      {
        group: gid,
        sha: "a1",
        author: { name: "Alice" },
        date: new Date("2026-01-05"),
      },
      {
        group: gid,
        sha: "a2",
        author: { name: "Bob" },
        date: new Date("2026-01-06"),
      },
    ]);
    await Issue.create({
      group: gid,
      number: 1,
      title: "Bug",
      state: "CLOSED",
      createdAt: new Date("2026-01-01"),
      closedAt: new Date("2026-01-10"),
    });
    await PullRequest.create({
      group: gid,
      number: 1,
      title: "PR",
      state: "MERGED",
      createdAt: new Date("2026-01-05"),
      mergedAt: new Date("2026-01-08"),
    });

    const request = makeRequest(gid.toString(), {
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
    const response = await GET(request, {
      params: Promise.resolve({ groupId: gid.toString() }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toHaveProperty("contributors");
    expect(body).toHaveProperty("totalCommits");
    expect(body).toHaveProperty("totalIssuesClosed");
    expect(body).toHaveProperty("totalPullRequestsOpened");
    expect(body).toHaveProperty("totalPullRequestsMerged");
    expect(body).toHaveProperty("sprintVelocity");

    expect(body.totalCommits).toBe(2);
    expect(body.totalIssuesClosed).toBe(1);
    expect(body.totalPullRequestsOpened).toBe(1);
    expect(body.totalPullRequestsMerged).toBe(1);
    expect(body.contributors).toHaveLength(2);
  });

  // Test 2: test case for using sprintId query param to scope the date range
  it("should use sprintId query param to scope the date range", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const group = await createGroup();
    const gid = group._id;

    const sprint = await Sprint.create({
      group: gid,
      name: "Sprint 1",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-14"),
    });

    await Commit.insertMany([
      {
        group: gid,
        sha: "in",
        author: { name: "Alice" },
        date: new Date("2026-01-05"),
      },
      {
        group: gid,
        sha: "out",
        author: { name: "Alice" },
        date: new Date("2026-01-20"),
      },
    ]);

    const request = makeRequest(gid.toString(), {
      sprintId: sprint._id.toString(),
    });
    const response = await GET(request, {
      params: Promise.resolve({ groupId: gid.toString() }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    // Only the commit within sprint 1 range should be counted
    expect(body.totalCommits).toBe(1);
  });

  // Test 3: test case for default date rangeing to last 30 days when no period specified
  it("should default to last 30 days when no period specified", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const group = await createGroup();
    const gid = group._id;

    // Recent commit (within 30 days)
    await Commit.create({
      group: gid,
      sha: "recent",
      author: { name: "Alice" },
      date: new Date(), // today
    });
    // Old commit (>30 days ago)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60);
    await Commit.create({
      group: gid,
      sha: "old",
      author: { name: "Alice" },
      date: oldDate,
    });

    const request = makeRequest(gid.toString());
    const response = await GET(request, {
      params: Promise.resolve({ groupId: gid.toString() }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalCommits).toBe(1); // only the recent commit
  });

  // Test 4: test case for invalid date formats in query params
  it("should return sprint velocity with commit counts", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const group = await createGroup();
    const gid = group._id;

    await Sprint.create({
      group: gid,
      name: "Sprint 1",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-14"),
    });

    await Commit.insertMany([
      {
        group: gid,
        sha: "c1",
        author: { name: "A" },
        date: new Date("2026-01-05"),
      },
      {
        group: gid,
        sha: "c2",
        author: { name: "B" },
        date: new Date("2026-01-10"),
      },
    ]);

    const request = makeRequest(gid.toString(), {
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
    const response = await GET(request, {
      params: Promise.resolve({ groupId: gid.toString() }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sprintVelocity).toHaveLength(1);
    expect(body.sprintVelocity[0].name).toBe("Sprint 1");
    expect(body.sprintVelocity[0].commitCount).toBe(2);
  });
});
