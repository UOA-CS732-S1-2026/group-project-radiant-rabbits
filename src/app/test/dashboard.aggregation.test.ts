import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  aggregateDashboard,
  buildCacheKey,
  resolveDateRange,
} from "@/app/api/groups/[groupId]/dashboard/route";
import { Commit, Group, Issue, PullRequest, Sprint } from "@/app/lib/models";

// Create mocks for all dependencies used in the route handler
jest.mock("@/app/lib/mongodbConnection", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
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

let mongoServer: MongoMemoryServer;
let groupId: mongoose.Types.ObjectId;

// Connect to MongoDB before running tests, and disconnect afterwards
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "test" });
  const group = await Group.create({
    name: "Test Group",
    description: "Test",
    inviteCode: "agg-test",
    members: ["user1"],
    createdBy: "user1",
  });
  groupId = group._id as mongoose.Types.ObjectId;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear all mocks before each test to ensure test isolation
afterEach(async () => {
  await Promise.all([
    Commit.deleteMany({}),
    PullRequest.deleteMany({}),
    Issue.deleteMany({}),
    Sprint.deleteMany({}),
  ]);
  jest.clearAllMocks();
});

// Helper to build a cache key based on the dashboard filters
describe("buildCacheKey", () => {
  it("should build key with sprintId", () => {
    expect(buildCacheKey("g1", "s1")).toBe("dashboard:g1:sprint:s1");
  });

  it("should build key with date range", () => {
    expect(buildCacheKey("g1", undefined, "2026-01-01", "2026-01-31")).toBe(
      "dashboard:g1:range:2026-01-01:2026-01-31",
    );
  });

  it("should build default key when no period specified", () => {
    expect(buildCacheKey("g1")).toBe("dashboard:g1:default");
  });

  it("should prefer sprintId over date range", () => {
    expect(buildCacheKey("g1", "s1", "2026-01-01", "2026-01-31")).toBe(
      "dashboard:g1:sprint:s1",
    );
  });
});

// Describe the test suite for date range resolution logic
describe("resolveDateRange", () => {
  // Test 1: test case for using sprint dates when sprintId is provided
  it("should use sprint dates when sprintId is provided", async () => {
    const sprint = await Sprint.create({
      group: groupId,
      name: "Sprint 1",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-14"),
      isCurrent: false,
    });

    const result = await resolveDateRange(
      groupId.toString(),
      sprint._id.toString(),
    );
    expect(result.start).toEqual(new Date("2026-01-01"));
    expect(result.end).toEqual(new Date("2026-01-14"));
    expect(result.sprint).toBeTruthy();
  });

  // Test 2: test case for using explicit start/end dates when provided
  it("should use explicit start/end dates when provided", async () => {
    const result = await resolveDateRange(
      groupId.toString(),
      undefined,
      "2026-03-01",
      "2026-03-31",
    );
    expect(result.start).toEqual(new Date("2026-03-01"));
    expect(result.end).toEqual(new Date("2026-03-31"));
    expect(result.sprint).toBeNull();
  });

  // Test 3: test case for defaulting to current sprint when no period specified
  it("should default to current sprint if no period specified", async () => {
    await Sprint.create({
      group: groupId,
      name: "Sprint 2",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-02-14"),
      isCurrent: true,
    });

    const result = await resolveDateRange(groupId.toString());
    expect(result.start).toEqual(new Date("2026-02-01"));
    expect(result.end).toEqual(new Date("2026-02-14"));
    expect(result.sprint).toBeTruthy();
  });

  // Test 4: test case for defaulting to last 30 days when no sprint exists
  it("should default to last 30 days if no sprint exists", async () => {
    const before = new Date();
    const result = await resolveDateRange(groupId.toString());
    const after = new Date();

    expect(result.sprint).toBeNull();
    const daysDiff =
      (result.end.getTime() - result.start.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(30, 0);
    expect(result.end.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.end.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
  });
});

// Describe the test suite for dashboard data aggregation logic
describe("aggregateDashboard", () => {
  const start = new Date("2026-01-01");
  const end = new Date("2026-01-31");

  // Test 1: test case for empty data resulting in zero counts
  it("should return zero counts when no data exists", async () => {
    const result = await aggregateDashboard(groupId.toString(), start, end);

    expect(result.contributors).toEqual([]);
    expect(result.totalCommits).toBe(0);
    expect(result.totalIssuesClosed).toBe(0);
    expect(result.totalPullRequestsOpened).toBe(0);
    expect(result.totalPullRequestsMerged).toBe(0);
    expect(result.sprintVelocity).toEqual([]);
  });

  // Test 2: test case for counting commits and grouping contributors
  it("should count commits and group contributors", async () => {
    await Commit.insertMany([
      {
        group: groupId,
        sha: "aaa",
        author: { name: "Alice", email: "alice@example.com" },
        message: "First",
        date: new Date("2026-01-05"),
      },
      {
        group: groupId,
        sha: "bbb",
        author: { name: "Alice", email: "alice@example.com" },
        message: "Second",
        date: new Date("2026-01-06"),
      },
      {
        group: groupId,
        sha: "ccc",
        author: { name: "Bob", email: "bob@example.com" },
        message: "Third",
        date: new Date("2026-01-07"),
      },
      // Outside range — should be excluded
      {
        group: groupId,
        sha: "ddd",
        author: { name: "Alice", email: "alice@example.com" },
        message: "Before range",
        date: new Date("2025-12-15"),
      },
    ]);

    const result = await aggregateDashboard(groupId.toString(), start, end);

    expect(result.totalCommits).toBe(3);
    expect(result.contributors).toHaveLength(2);
    expect(result.contributors[0].author).toBe("Alice");
    expect(result.contributors[0].commitCount).toBe(2);
    expect(result.contributors[1].author).toBe("Bob");
    expect(result.contributors[1].commitCount).toBe(1);
  });

  // Test 3: test case for counting closed issues, opened and merged PRs
  it("should count closed issues in the period", async () => {
    await Issue.insertMany([
      {
        group: groupId,
        number: 1,
        title: "Bug A",
        state: "CLOSED",
        createdAt: new Date("2026-01-01"),
        closedAt: new Date("2026-01-10"),
      },
      {
        group: groupId,
        number: 2,
        title: "Bug B",
        state: "CLOSED",
        createdAt: new Date("2026-01-01"),
        closedAt: new Date("2026-01-20"),
      },
      // Still open — should not count
      {
        group: groupId,
        number: 3,
        title: "Feature",
        state: "OPEN",
        createdAt: new Date("2026-01-01"),
        closedAt: null,
      },
      // Closed outside range
      {
        group: groupId,
        number: 4,
        title: "Old bug",
        state: "CLOSED",
        createdAt: new Date("2025-11-01"),
        closedAt: new Date("2025-12-01"),
      },
    ]);

    const result = await aggregateDashboard(groupId.toString(), start, end);
    expect(result.totalIssuesClosed).toBe(2);
  });

  // Test 4: test case for counting opened and merged PRs separately
  it("should count opened and merged PRs separately", async () => {
    await PullRequest.insertMany([
      {
        group: groupId,
        number: 1,
        title: "PR 1",
        state: "MERGED",
        createdAt: new Date("2026-01-05"),
        mergedAt: new Date("2026-01-08"),
      },
      {
        group: groupId,
        number: 2,
        title: "PR 2",
        state: "MERGED",
        createdAt: new Date("2026-01-10"),
        mergedAt: new Date("2026-01-12"),
      },
      {
        group: groupId,
        number: 3,
        title: "PR 3",
        state: "OPEN",
        createdAt: new Date("2026-01-15"),
        mergedAt: null,
      },
      {
        group: groupId,
        number: 4,
        title: "PR 4",
        state: "OPEN",
        createdAt: new Date("2025-12-01"),
        mergedAt: null,
      },
    ]);

    const result = await aggregateDashboard(groupId.toString(), start, end);
    expect(result.totalPullRequestsOpened).toBe(3); // PRs 1, 2, 3
    expect(result.totalPullRequestsMerged).toBe(2); // PRs 1, 2
  });

  // Test 5: test case for computing sprint velocity with commit counts
  it("should compute sprint velocity with commit counts", async () => {
    await Sprint.create({
      group: groupId,
      name: "Sprint 1",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-14"),
    });
    await Sprint.create({
      group: groupId,
      name: "Sprint 2",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-01-31"),
    });

    await Commit.insertMany([
      {
        group: groupId,
        sha: "s1a",
        author: { name: "Alice" },
        date: new Date("2026-01-05"),
      },
      {
        group: groupId,
        sha: "s1b",
        author: { name: "Bob" },
        date: new Date("2026-01-10"),
      },
      {
        group: groupId,
        sha: "s2a",
        author: { name: "Alice" },
        date: new Date("2026-01-20"),
      },
    ]);

    const result = await aggregateDashboard(groupId.toString(), start, end);

    expect(result.sprintVelocity).toHaveLength(2);
    expect(result.sprintVelocity[0].name).toBe("Sprint 1");
    expect(result.sprintVelocity[0].commitCount).toBe(2);
    expect(result.sprintVelocity[1].name).toBe("Sprint 2");
    expect(result.sprintVelocity[1].commitCount).toBe(1);
  });

  // Test 6: test case for ensuring data from other groups is not included
  it("should filter sprint velocity to a single sprint when sprintId is given", async () => {
    const sprint1 = await Sprint.create({
      group: groupId,
      name: "Sprint 1",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-14"),
    });
    await Sprint.create({
      group: groupId,
      name: "Sprint 2",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-01-31"),
    });

    const result = await aggregateDashboard(
      groupId.toString(),
      start,
      end,
      sprint1._id.toString(),
    );

    expect(result.sprintVelocity).toHaveLength(1);
    expect(result.sprintVelocity[0].name).toBe("Sprint 1");
  });

  // Test 7: test case to ensure commits from other groups are not counted
  it("should not count data from other groups", async () => {
    const otherGroup = await Group.create({
      name: "Other Group",
      description: "Other",
      inviteCode: "other-test",
      members: ["user2"],
      createdBy: "user2",
    });

    await Commit.insertMany([
      {
        group: groupId,
        sha: "mine",
        author: { name: "Alice" },
        date: new Date("2026-01-05"),
      },
      {
        group: otherGroup._id,
        sha: "theirs",
        author: { name: "Eve" },
        date: new Date("2026-01-05"),
      },
    ]);

    const result = await aggregateDashboard(groupId.toString(), start, end);
    expect(result.totalCommits).toBe(1);
    expect(result.contributors).toHaveLength(1);
    expect(result.contributors[0].author).toBe("Alice");

    await Group.deleteOne({ _id: otherGroup._id });
  });
});
