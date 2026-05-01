import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  Commit,
  Contributor,
  Group,
  Issue,
  PullRequest,
  Sprint,
  SprintTask,
} from "@/app/lib/models";
import { syncGroup } from "@/app/lib/syncService";

// Mock the entire githubService module for syncService to call

jest.mock("@/app/lib/githubService");

import {
  fetchCommits,
  fetchIssues,
  fetchIterations,
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
const mockFetchIterations = fetchIterations as jest.MockedFunction<
  typeof fetchIterations
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
    Sprint.deleteMany({}),
    SprintTask.deleteMany({}),
  ]);
  jest.clearAllMocks();
});

// Default all GitHub fetchers to empty so tests only need to set what they care about.
// fetchIterations is required (introduced for the iteration-based sprint flow); without
// this default, syncGroup would throw because the auto-mock returns undefined.
beforeEach(() => {
  mockFetchCommits.mockResolvedValue([]);
  mockFetchPRs.mockResolvedValue([]);
  mockFetchIssues.mockResolvedValue([]);
  mockFetchProjectTasks.mockResolvedValue([]);
  mockFetchIterations.mockResolvedValue([]);
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

    mockFetchProjectTasks.mockResolvedValue([
      {
        title: "Setup CI",
        status: "DONE",
        assignees: ["alice"],
        issueNumber: 5,
        iterationId: null,
      },
      {
        title: "Write tests",
        status: "IN_PROGRESS",
        assignees: ["bob"],
        issueNumber: 6,
        iterationId: null,
      },
    ]);

    await syncGroup(group._id.toString(), "fake-token");

    const tasks = await SprintTask.find({ group: group._id });
    expect(tasks).toHaveLength(2);
    expect(tasks.find((t) => t.issueNumber === 5)?.status).toBe("DONE");
    expect(tasks.find((t) => t.issueNumber === 6)?.status).toBe("IN_PROGRESS");
  });

  it("should upsert sprints from iterations and link tasks via iterationId", async () => {
    const group = await createTestGroup();

    // Two iterations: one in the past, one in the future relative to "today".
    // The current date in this test environment is around mid-2026, so we
    // pick fixed dates well outside the active window.
    mockFetchIterations.mockResolvedValue([
      {
        id: "iter_past",
        title: "Sprint 1",
        startDate: "2026-01-01",
        duration: 14,
      },
      {
        id: "iter_future",
        title: "Sprint 99",
        startDate: "2030-01-01",
        duration: 14,
      },
    ]);

    mockFetchProjectTasks.mockResolvedValue([
      {
        title: "Done in past sprint",
        status: "DONE",
        assignees: ["alice"],
        issueNumber: 1,
        iterationId: "iter_past",
      },
      {
        title: "Planned for future sprint",
        status: "TODO",
        assignees: ["bob"],
        issueNumber: 2,
        iterationId: "iter_future",
      },
      {
        title: "Backlog item",
        status: "TODO",
        assignees: [],
        issueNumber: 3,
        iterationId: null,
      },
    ]);

    await syncGroup(group._id.toString(), "fake-token");

    // Sprints should be created with derived statuses.
    const sprints = await Sprint.find({ group: group._id });
    expect(sprints).toHaveLength(2);

    const past = sprints.find((s) => s.iterationId === "iter_past");
    expect(past?.status).toBe("COMPLETED");
    expect(past?.isCurrent).toBe(false);
    expect(past?.name).toBe("Sprint 1");

    const future = sprints.find((s) => s.iterationId === "iter_future");
    expect(future?.status).toBe("PLANNING");
    expect(future?.isCurrent).toBe(false);

    // Tasks should be linked to their sprint via iterationId resolution.
    const tasks = await SprintTask.find({ group: group._id });
    const pastTask = tasks.find((t) => t.issueNumber === 1);
    const futureTask = tasks.find((t) => t.issueNumber === 2);
    const backlogTask = tasks.find((t) => t.issueNumber === 3);

    expect(pastTask?.sprint?.toString()).toBe(past?._id.toString());
    expect(futureTask?.sprint?.toString()).toBe(future?._id.toString());
    expect(backlogTask?.sprint).toBeNull();
  });

  it("should mark a sprint as ACTIVE/isCurrent when today falls within its range", async () => {
    const group = await createTestGroup();

    // Build an iteration that started yesterday and lasts 14 days.
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yyyy = yesterday.getUTCFullYear();
    const mm = String(yesterday.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(yesterday.getUTCDate()).padStart(2, "0");

    mockFetchIterations.mockResolvedValue([
      {
        id: "iter_active",
        title: "Sprint Active",
        startDate: `${yyyy}-${mm}-${dd}`,
        duration: 14,
      },
    ]);

    await syncGroup(group._id.toString(), "fake-token");

    const sprint = await Sprint.findOne({
      group: group._id,
      iterationId: "iter_active",
    });
    expect(sprint?.status).toBe("ACTIVE");
    expect(sprint?.isCurrent).toBe(true);
  });

  it("should preserve local sprints that no longer appear in GitHub iterations", async () => {
    const group = await createTestGroup();

    // Pre-existing sprint tied to an iteration that GitHub no longer returns
    await Sprint.create({
      group: group._id,
      iterationId: "iter_deleted",
      name: "Deleted Sprint",
      startDate: new Date("2025-12-01"),
      endDate: new Date("2025-12-14"),
      status: "COMPLETED",
      isCurrent: false,
    });

    mockFetchIterations.mockResolvedValue([]);

    await syncGroup(group._id.toString(), "fake-token");

    const sprint = await Sprint.findOne({
      group: group._id,
      iterationId: "iter_deleted",
    });
    expect(sprint).not.toBeNull();
  });
});

// Incremental sync tests

describe("Incremental sync", () => {
  it("should pass lastSyncAt as since parameter on subsequent syncs", async () => {
    const lastSync = new Date("2026-03-01T00:00:00Z");
    const group = await createTestGroup({ lastSyncAt: lastSync });

    // Seed an existing commit so hasExistingSyncedData() in syncGroup returns true.
    // Without this, the incremental-sync guard treats the group as a first sync
    // and intentionally omits the `since` parameter.
    await Commit.create({
      sha: "seed",
      message: "seed commit from previous sync",
      author: { name: "seed", email: "seed@test.com" },
      date: new Date("2026-02-01"),
      group: group._id,
    });

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
