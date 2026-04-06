import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  Commit,
  Contributor,
  Group,
  Issue,
  PullRequest,
  SprintTask,
} from "@/app/lib/models";
import { syncGroup } from "@/app/lib/syncService";

// Mock the entire githubService module for syncService to call

jest.mock("@/app/lib/githubService");

import {
  fetchCommits,
  fetchIssues,
  fetchProjectTasks,
  fetchPullRequests,
} from "@/app/lib/githubService";

const mockFetchCommits = fetchCommits as jest.MockedFunction<
  typeof fetchCommits
>;
const mockFetchPRs = fetchPullRequests as jest.MockedFunction<
  typeof fetchPullRequests
>;
const mockFetchIssues = fetchIssues as jest.MockedFunction<typeof fetchIssues>;
const mockFetchProjectTasks = fetchProjectTasks as jest.MockedFunction<
  typeof fetchProjectTasks
>;

// Mock the MongoDB connection
jest.mock("@/app/lib/mongodbConnection", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Uses an in-memory MongoDB instance (MongoDB Memory Server) for testing

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "test" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clean all collections between tests so they don't interfere
afterEach(async () => {
  await Promise.all([
    Group.deleteMany({}),
    Commit.deleteMany({}),
    PullRequest.deleteMany({}),
    Issue.deleteMany({}),
    Contributor.deleteMany({}),
    SprintTask.deleteMany({}),
  ]);
  jest.clearAllMocks();
});

// Helper: creates a group with repoOwner/repoName set up for syncing
async function createTestGroup(overrides = {}) {
  return Group.create({
    name: "Test Group",
    description: "A test group",
    inviteCode: "TESTCODE",
    members: ["user1"],
    createdBy: "user1",
    repoOwner: "testowner",
    repoName: "testrepo",
    syncStatus: "pending",
    ...overrides,
  });
}

// Upsert logic tests

describe("Upsert logic", () => {
  it("should insert new commits on first sync", async () => {
    const group = await createTestGroup();

    // Mock GitHub responses
    mockFetchCommits.mockResolvedValue([
      {
        sha: "abc123",
        message: "Initial commit",
        author: { name: "Alice", email: "alice@test.com", login: "alice" },
        date: "2026-01-01T00:00:00Z",
        filesChanged: 3,
      },
      {
        sha: "def456",
        message: "Add feature",
        author: { name: "Bob", email: "bob@test.com", login: "bob" },
        date: "2026-01-02T00:00:00Z",
      },
    ]);
    mockFetchPRs.mockResolvedValue([]);
    mockFetchIssues.mockResolvedValue([]);
    mockFetchProjectTasks.mockResolvedValue([]);

    await syncGroup(group._id.toString(), "fake-token");

    // Verify commits were inserted
    const commits = await Commit.find({ group: group._id });
    expect(commits).toHaveLength(2);
    expect(commits.map((c) => c.sha).sort()).toEqual(["abc123", "def456"]);
  });

  it("should update existing commits without creating duplicates", async () => {
    const group = await createTestGroup();

    // Insert an existing commit
    await Commit.create({
      sha: "abc123",
      message: "Old message",
      author: { name: "Alice", email: "alice@test.com" },
      date: new Date("2026-01-01"),
      group: group._id,
    });

    // Sync returns the same commit with an updated message
    mockFetchCommits.mockResolvedValue([
      {
        sha: "abc123",
        message: "Updated message",
        author: { name: "Alice", email: "alice@test.com", login: "alice" },
        date: "2026-01-01T00:00:00Z",
      },
    ]);
    mockFetchPRs.mockResolvedValue([]);
    mockFetchIssues.mockResolvedValue([]);
    mockFetchProjectTasks.mockResolvedValue([]);

    await syncGroup(group._id.toString(), "fake-token");

    // Should still be 1 commit, not 2 - upsert updated the existing one
    const commits = await Commit.find({ group: group._id });
    expect(commits).toHaveLength(1);
    expect(commits[0].message).toBe("Updated message");
  });

  it("should upsert PRs by number + group", async () => {
    const group = await createTestGroup();

    mockFetchCommits.mockResolvedValue([]);
    mockFetchPRs.mockResolvedValue([
      {
        number: 1,
        title: "First PR",
        state: "OPEN",
        createdAt: "2026-01-01T00:00:00Z",
        closedAt: null,
        mergedAt: null,
        author: "alice",
      },
    ]);
    mockFetchIssues.mockResolvedValue([]);
    mockFetchProjectTasks.mockResolvedValue([]);

    // Sync twice - second time the PR has been merged
    await syncGroup(group._id.toString(), "fake-token");

    mockFetchPRs.mockResolvedValue([
      {
        number: 1,
        title: "First PR",
        state: "MERGED",
        createdAt: "2026-01-01T00:00:00Z",
        closedAt: "2026-01-05T00:00:00Z",
        mergedAt: "2026-01-05T00:00:00Z",
        author: "alice",
      },
    ]);

    await syncGroup(group._id.toString(), "fake-token");

    // Should be 1 PR with updated state, not 2 duplicates
    const prs = await PullRequest.find({ group: group._id });
    expect(prs).toHaveLength(1);
    expect(prs[0].state).toBe("MERGED");
    expect(prs[0].mergedAt).toBeTruthy();
  });

  it("should upsert issues by number + group", async () => {
    const group = await createTestGroup();

    mockFetchCommits.mockResolvedValue([]);
    mockFetchPRs.mockResolvedValue([]);
    mockFetchIssues.mockResolvedValue([
      {
        number: 10,
        title: "Bug report",
        state: "OPEN",
        createdAt: "2026-01-01T00:00:00Z",
        closedAt: null,
        author: "alice",
      },
    ]);
    mockFetchProjectTasks.mockResolvedValue([]);

    await syncGroup(group._id.toString(), "fake-token");

    // Issue gets closed
    mockFetchIssues.mockResolvedValue([
      {
        number: 10,
        title: "Bug report",
        state: "CLOSED",
        createdAt: "2026-01-01T00:00:00Z",
        closedAt: "2026-01-10T00:00:00Z",
        author: "alice",
      },
    ]);

    await syncGroup(group._id.toString(), "fake-token");

    const issues = await Issue.find({ group: group._id });
    expect(issues).toHaveLength(1);
    expect(issues[0].state).toBe("CLOSED");
    expect(issues[0].closedAt).toBeTruthy();
  });

  it("should extract contributors from commit authors", async () => {
    const group = await createTestGroup();

    // Two commits by Alice, one by Bob
    mockFetchCommits.mockResolvedValue([
      {
        sha: "aaa",
        message: "First",
        author: { name: "Alice", email: "alice@test.com", login: "alice" },
        date: "2026-01-01T00:00:00Z",
      },
      {
        sha: "bbb",
        message: "Second",
        author: { name: "Alice", email: "alice@test.com", login: "alice" },
        date: "2026-01-02T00:00:00Z",
      },
      {
        sha: "ccc",
        message: "Third",
        author: { name: "Bob", email: "bob@test.com", login: "bob" },
        date: "2026-01-03T00:00:00Z",
      },
    ]);
    mockFetchPRs.mockResolvedValue([]);
    mockFetchIssues.mockResolvedValue([]);
    mockFetchProjectTasks.mockResolvedValue([]);

    await syncGroup(group._id.toString(), "fake-token");

    // Should be 2 contributors (Alice deduplicated), not 3
    const contributors = await Contributor.find({ group: group._id });
    expect(contributors).toHaveLength(2);
    expect(contributors.map((c) => c.githubId).sort()).toEqual([
      "alice",
      "bob",
    ]);
  });

  it("should upsert sprint tasks from project board", async () => {
    const group = await createTestGroup();

    mockFetchCommits.mockResolvedValue([]);
    mockFetchPRs.mockResolvedValue([]);
    mockFetchIssues.mockResolvedValue([]);
    mockFetchProjectTasks.mockResolvedValue([
      {
        title: "Setup CI",
        status: "DONE",
        assignees: ["alice"],
        issueNumber: 5,
      },
      {
        title: "Write tests",
        status: "IN_PROGRESS",
        assignees: ["bob"],
        issueNumber: 6,
      },
    ]);

    await syncGroup(group._id.toString(), "fake-token");

    const tasks = await SprintTask.find({ group: group._id });
    expect(tasks).toHaveLength(2);
    expect(tasks.find((t) => t.issueNumber === 5)?.status).toBe("DONE");
    expect(tasks.find((t) => t.issueNumber === 6)?.status).toBe("IN_PROGRESS");
  });
});

// Incremental sync tests

describe("Incremental sync", () => {
  it("should pass lastSyncAt as since parameter on subsequent syncs", async () => {
    const lastSync = new Date("2026-03-01T00:00:00Z");
    const group = await createTestGroup({ lastSyncAt: lastSync });

    mockFetchCommits.mockResolvedValue([]);
    mockFetchPRs.mockResolvedValue([]);
    mockFetchIssues.mockResolvedValue([]);
    mockFetchProjectTasks.mockResolvedValue([]);

    await syncGroup(group._id.toString(), "fake-token");

    // Verify that fetchCommits was called with the since parameter
    expect(mockFetchCommits).toHaveBeenCalledWith(
      "fake-token",
      "testowner",
      "testrepo",
      lastSync.toISOString(),
    );
    expect(mockFetchPRs).toHaveBeenCalledWith(
      "fake-token",
      "testowner",
      "testrepo",
      lastSync.toISOString(),
    );
    expect(mockFetchIssues).toHaveBeenCalledWith(
      "fake-token",
      "testowner",
      "testrepo",
      lastSync.toISOString(),
    );
  });

  it("should NOT pass since on first sync (lastSyncAt is null)", async () => {
    const group = await createTestGroup({ lastSyncAt: null });

    mockFetchCommits.mockResolvedValue([]);
    mockFetchPRs.mockResolvedValue([]);
    mockFetchIssues.mockResolvedValue([]);
    mockFetchProjectTasks.mockResolvedValue([]);

    await syncGroup(group._id.toString(), "fake-token");

    // since should be undefined (not passed)
    expect(mockFetchCommits).toHaveBeenCalledWith(
      "fake-token",
      "testowner",
      "testrepo",
      undefined,
    );
  });

  it("should update lastSyncAt after successful sync", async () => {
    const group = await createTestGroup();

    mockFetchCommits.mockResolvedValue([]);
    mockFetchPRs.mockResolvedValue([]);
    mockFetchIssues.mockResolvedValue([]);
    mockFetchProjectTasks.mockResolvedValue([]);

    const beforeSync = new Date();
    await syncGroup(group._id.toString(), "fake-token");

    const updatedGroup = await Group.findById(group._id);
    expect(updatedGroup.syncStatus).toBe("success");
    // lastSyncAt should be set to roughly now
    expect(updatedGroup.lastSyncAt.getTime()).toBeGreaterThanOrEqual(
      beforeSync.getTime(),
    );
  });

  it("should not overwrite existing data on partial sync", async () => {
    const group = await createTestGroup();

    // First sync: 2 commits
    mockFetchCommits.mockResolvedValue([
      {
        sha: "old1",
        message: "Old commit 1",
        author: { name: "A", email: "a@test.com" },
        date: "2026-01-01T00:00:00Z",
      },
      {
        sha: "old2",
        message: "Old commit 2",
        author: { name: "B", email: "b@test.com" },
        date: "2026-01-02T00:00:00Z",
      },
    ]);
    mockFetchPRs.mockResolvedValue([]);
    mockFetchIssues.mockResolvedValue([]);
    mockFetchProjectTasks.mockResolvedValue([]);

    await syncGroup(group._id.toString(), "fake-token");
    expect(await Commit.countDocuments({ group: group._id })).toBe(2);

    // Second sync: only 1 new commit (incremental)
    mockFetchCommits.mockResolvedValue([
      {
        sha: "new1",
        message: "New commit",
        author: { name: "C", email: "c@test.com" },
        date: "2026-01-03T00:00:00Z",
      },
    ]);

    await syncGroup(group._id.toString(), "fake-token");

    // Should have 3 total - old data preserved, new data added
    expect(await Commit.countDocuments({ group: group._id })).toBe(3);
  });
});

// Sync status tests

describe("Sync status", () => {
  it("should set syncStatus to success after successful sync", async () => {
    const group = await createTestGroup();

    mockFetchCommits.mockResolvedValue([]);
    mockFetchPRs.mockResolvedValue([]);
    mockFetchIssues.mockResolvedValue([]);
    mockFetchProjectTasks.mockResolvedValue([]);

    await syncGroup(group._id.toString(), "fake-token");

    const updated = await Group.findById(group._id);
    expect(updated.syncStatus).toBe("success");
    expect(updated.syncError).toBeNull();
  });

  it("should set syncStatus to failed when repo is missing", async () => {
    // Group without repoOwner - sync should fail gracefully
    const group = await createTestGroup({ repoOwner: null });

    await syncGroup(group._id.toString(), "fake-token");

    const updated = await Group.findById(group._id);
    expect(updated.syncStatus).toBe("failed");
    expect(updated.syncError).toContain("missing repoOwner or repoName");
  });

  it("should set syncStatus to failed on GitHub API error", async () => {
    const group = await createTestGroup();

    // Simulate a GitHub API error (repo not found)
    const { GitHubApiError } = jest.requireActual("@/app/lib/githubService");
    mockFetchCommits.mockRejectedValue(new GitHubApiError("Not Found", 404));
    mockFetchPRs.mockResolvedValue([]);
    mockFetchIssues.mockResolvedValue([]);
    mockFetchProjectTasks.mockResolvedValue([]);

    await syncGroup(group._id.toString(), "fake-token");

    const updated = await Group.findById(group._id);
    expect(updated.syncStatus).toBe("failed");
    expect(updated.syncError).toContain("Not Found");
  });
});
