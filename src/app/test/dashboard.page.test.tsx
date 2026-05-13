import { render } from "@testing-library/react";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import DashboardPage from "@/app/(main)/dashboard/page";
import { Group, User } from "@/app/lib/models";
import { normalizeUserRef } from "@/app/lib/userRef";

// Create a mock for all dependencies used in the dashboard page
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

jest.mock("@/app/lib/mongodbConnection", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/app/api/auth/[...nextauth]/options", () => ({
  options: {},
}));

jest.mock("@/app/lib/syncService", () => ({
  syncGroup: jest.fn(),
}));

jest.mock("@/components/dashboard/Dashboard", () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

import Dashboard from "@/components/dashboard/Dashboard";

// Define the mocked functions with proper types
const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockRedirect = redirect as unknown as jest.Mock;
const MockDashboard = Dashboard as unknown as jest.Mock;
const mockHeaders = headers as jest.MockedFunction<typeof headers>;

const USER_ID = "user-dashboard-test";

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

beforeEach(() => {
  mockHeaders.mockReturnValue(new Headers({ host: "localhost:3000" }));
  global.fetch = jest.fn();
});

afterEach(async () => {
  await Promise.all([Group.deleteMany({}), User.deleteMany({})]);
  jest.clearAllMocks();
});

// Helper to build a signed-in session tied to USER_ID.
function authedSession(
  opts: { accessToken?: string | null } = { accessToken: "gh-token" },
) {
  const accessToken = opts.accessToken ?? undefined;
  return { user: { id: USER_ID }, accessToken } as unknown as Awaited<
    ReturnType<typeof getServerSession>
  >;
}

// Helper to build a seed user + group so the page's group-selection loop picks it
async function seedUserWithGroup(
  overrides: Partial<{
    repoOwner: string | null;
    repoName: string | null;
    syncStatus:
      | "pending"
      | "in_progress"
      | "success"
      | "failed"
      | "rate_limited";
  }> = {},
) {
  const userRef = normalizeUserRef(USER_ID);
  const group = await Group.create({
    name: "Radiant Rabbits",
    description: "Test group",
    inviteCode: `INV-${Date.now()}-${Math.random()}`,
    members: [userRef],
    createdBy: userRef,
    repoOwner:
      overrides.repoOwner === undefined ? "radiant" : overrides.repoOwner,
    repoName: overrides.repoName === undefined ? "rabbits" : overrides.repoName,
    syncStatus: overrides.syncStatus ?? "success",
  });

  await User.create({
    _id: userRef,
    githubId: USER_ID,
    login: USER_ID,
    name: "Dashboard Tester",
    email: `${USER_ID}@example.com`,
    currentGroupId: group._id,
  });

  return group;
}

function lastDashboardProps() {
  const calls = MockDashboard.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][0];
}

function mockDashboardApi(
  payload: Record<string, unknown>,
  ok = true,
  status = 200,
) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok,
    status,
    json: async () => payload,
  });
}

// Describe the test suite for the dashboard page
describe("DashboardPage — auth + error branches", () => {
  // Test 1: test case for unauthenticated user
  it("should redirect to '/' when there is no session", async () => {
    mockGetServerSession.mockResolvedValue(null);

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/");
    expect(MockDashboard).not.toHaveBeenCalled();
  });

  // Test 2: test case for authenticated user with no group
  it("should render status='empty' when the user has no group", async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const userRef = normalizeUserRef(USER_ID);
    await User.create({
      _id: userRef,
      githubId: USER_ID,
      login: USER_ID,
      name: "No Group User",
      email: `${USER_ID}@example.com`,
    });

    const Page = await DashboardPage();
    render(Page);

    const props = lastDashboardProps();
    expect(props.status).toBe("empty");
    expect(props.statusMessage).toMatch(/No group selected yet/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should redirect to join/create page when current group is archived", async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const userRef = normalizeUserRef(USER_ID);
    const archivedGroup = await Group.create({
      name: "Archived Group",
      description: "Old project",
      inviteCode: `ARCH-${Date.now()}`,
      members: [userRef],
      createdBy: userRef,
      repoOwner: "radiant",
      repoName: "rabbits",
      syncStatus: "success",
      active: false,
    });

    await User.create({
      _id: userRef,
      githubId: USER_ID,
      login: USER_ID,
      name: "Dashboard Tester",
      email: `${USER_ID}@example.com`,
      currentGroupId: archivedGroup._id,
    });

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/join-create-switch-group");
    expect(MockDashboard).not.toHaveBeenCalled();
  });

  // Test 3: test case for missing group repo info
  it("should render status='error' when the selected group has no repository connected", async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    await seedUserWithGroup({ repoOwner: null, repoName: null });

    const Page = await DashboardPage();
    render(Page);

    const props = lastDashboardProps();
    expect(props.status).toBe("error");
    expect(props.statusMessage).toMatch(
      /No repository is connected to this group/i,
    );
    expect(props.repository.isConnected).toBe(false);
    expect(props.repository.validationError).toMatch(
      /No repository is connected/i,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // Test 4: test case for session lacking an accessToken
  it("should render status='error' when the session has no GitHub access token", async () => {
    mockGetServerSession.mockResolvedValue(
      authedSession({ accessToken: null }),
    );
    await seedUserWithGroup();

    const Page = await DashboardPage();
    render(Page);

    const props = lastDashboardProps();
    expect(props.status).toBe("error");
    expect(props.statusMessage).toMatch(/GitHub access token is missing/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // Test 5: test case for metric calculation throwing an error
  it("should render status='error' when dashboard API returns an error", async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    await seedUserWithGroup();

    mockDashboardApi({ error: "Failed to load dashboard data" }, false, 502);

    // Silence the console.error emitted inside the catch branch
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const Page = await DashboardPage();
    render(Page);
    errSpy.mockRestore();

    const props = lastDashboardProps();
    expect(props.status).toBe("error");
    expect(props.statusMessage).toBe("Failed to load dashboard data");
    expect(props.metrics).toBeUndefined();
  });
});

// Describe the test suite for the dashboard page's successful data flow
describe("DashboardPage — success path", () => {
  // Test 6: test case for successful dashboard loading
  it("should render status='ready' with metrics and repository info when everything succeeds", async () => {
    mockGetServerSession.mockResolvedValue(
      authedSession({ accessToken: "gh-token" }),
    );
    await seedUserWithGroup();

    const metrics = {
      totalCommits: 42,
      commitsLastSprint: 7,
      totalPullRequests: 10,
      pullRequestsMergedLastSprint: 3,
      totalIssuesClosed: 5,
      issuesClosedLastSprint: 2,
      activeContributors: 4,
      lastSprintStart: new Date("2026-01-01"),
      lastSprintEnd: new Date("2026-01-15"),
    };
    mockDashboardApi({
      contributors: [
        { author: "Alice", commitCount: 4, prCount: 1, issueCount: 0 },
        { author: "Bob", commitCount: 2, prCount: 0, issueCount: 1 },
        { author: "Casey", commitCount: 1, prCount: 2, issueCount: 2 },
        { author: "Dev", commitCount: 3, prCount: 0, issueCount: 0 },
      ],
      sprintVelocity: [],
      githubMetrics: metrics,
      repository: {
        owner: "radiant",
        name: "rabbits",
        isConnected: true,
        syncStatus: "success",
        syncError: null,
        validationError: null,
      },
    });

    const Page = await DashboardPage();
    render(Page);

    expect(global.fetch).toHaveBeenCalledTimes(1);

    const props = lastDashboardProps();
    expect(props.status).toBe("ready");
    expect(props.statusMessage).toBeUndefined();
    expect(props.metrics).toEqual(metrics);
    expect(props.repository).toMatchObject({
      owner: "radiant",
      name: "rabbits",
      isConnected: true,
      syncStatus: "success",
      validationError: null,
    });
    // No sprints seeded for this group — page returns an empty array.
    expect(props.sprints).toEqual([]);
  });

  // Test 7: sprints synced from iterations are passed through with velocity counts
  it("should pass synced sprints with velocity (commit count) and isCurrent flag", async () => {
    mockGetServerSession.mockResolvedValue(
      authedSession({ accessToken: "gh-token" }),
    );
    await seedUserWithGroup();

    mockDashboardApi({
      contributors: [],
      sprintVelocity: [
        {
          sprintId: "sprint-a",
          name: "Sprint A",
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-01-14T23:59:59.999Z",
          commitCount: 2,
          isCurrent: false,
        },
        {
          sprintId: "sprint-b",
          name: "Sprint B",
          startDate: "2026-01-15T00:00:00.000Z",
          endDate: "2026-01-28T23:59:59.999Z",
          commitCount: 2,
          isCurrent: true,
        },
      ],
      githubMetrics: {
        totalCommits: 4,
        commitsLastSprint: 0,
        totalPullRequests: 0,
        pullRequestsMergedLastSprint: 0,
        totalIssuesClosed: 0,
        issuesClosedLastSprint: 0,
        activeContributors: 0,
        lastSprintStart: new Date(),
        lastSprintEnd: new Date(),
      },
      repository: {
        owner: "radiant",
        name: "rabbits",
        isConnected: true,
        syncStatus: "success",
        syncError: null,
        validationError: null,
      },
    });

    const Page = await DashboardPage();
    render(Page);

    const props = lastDashboardProps();
    expect(props.sprints).toEqual([
      { name: "Sprint A", velocity: 2, isCurrent: false },
      { name: "Sprint B", velocity: 2, isCurrent: true },
    ]);
  });
});
