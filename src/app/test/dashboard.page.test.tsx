import { render, screen } from "@testing-library/react";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import DashboardPage from "@/app/(main)/dashboard/page";
import { calculateGithubMetricsLive } from "@/app/lib/githubCalculator";
import { Commit, Group, User } from "@/app/lib/models";
import { normalizeUserRef } from "@/app/lib/userRef";

// Create a mock for all dependencies used in the dashboard page
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
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

jest.mock("@/app/lib/githubCalculator", () => ({
  calculateGithubMetricsLive: jest.fn(),
}));

jest.mock("@/components/main/Dashboard", () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

import Dashboard from "@/components/main/Dashboard";

// Define the mocked functions with proper types
const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockRedirect = redirect as unknown as jest.Mock;
const mockCalculateGithubMetricsLive =
  calculateGithubMetricsLive as jest.MockedFunction<
    typeof calculateGithubMetricsLive
  >;
const MockDashboard = Dashboard as unknown as jest.Mock;

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

afterEach(async () => {
  await Promise.all([
    Group.deleteMany({}),
    User.deleteMany({}),
    Commit.deleteMany({}),
  ]);
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

// Helper to build a seed user + group + commit so the page's group-selection loop picks it
async function seedUserWithGroup(
  overrides: Partial<{
    repoOwner: string | null;
    repoName: string | null;
    sprintLengthWeeks: number | null;
    projectStartDate: Date | null;
    projectEndDate: Date | null;
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
    projectStartDate:
      overrides.projectStartDate === undefined
        ? new Date("2026-01-01")
        : overrides.projectStartDate,
    projectEndDate:
      overrides.projectEndDate === undefined
        ? new Date("2026-03-01")
        : overrides.projectEndDate,
    sprintLengthWeeks:
      overrides.sprintLengthWeeks === undefined
        ? 2
        : overrides.sprintLengthWeeks,
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

  // Seed a commit so the group passes the "hasCommitData" check in page.tsx
  await Commit.create({
    group: group._id,
    sha: `sha-${Date.now()}`,
    author: { name: "Tester", email: "tester@example.com" },
    date: new Date("2026-01-15"),
  });

  return group;
}

function lastDashboardProps() {
  const calls = MockDashboard.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][0];
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
    expect(mockCalculateGithubMetricsLive).not.toHaveBeenCalled();
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
    expect(mockCalculateGithubMetricsLive).not.toHaveBeenCalled();
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
    expect(mockCalculateGithubMetricsLive).not.toHaveBeenCalled();
  });

  // Test 5: test case for metric calculation throwing an error
  it("should render status='error' when calculateGithubMetricsLive throws", async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    await seedUserWithGroup();

    mockCalculateGithubMetricsLive.mockRejectedValueOnce(
      new Error("GitHub API rate limit exceeded"),
    );

    // Silence the console.error emitted inside the catch branch
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const Page = await DashboardPage();
    render(Page);
    errSpy.mockRestore();

    const props = lastDashboardProps();
    expect(props.status).toBe("error");
    expect(props.statusMessage).toBe("GitHub API rate limit exceeded");
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
    const group = await seedUserWithGroup({ sprintLengthWeeks: 2 });

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
    mockCalculateGithubMetricsLive.mockResolvedValueOnce(metrics);

    const Page = await DashboardPage();
    render(Page);

    // Calculator should be called with the converted sprint length (weeks * 7)
    expect(mockCalculateGithubMetricsLive).toHaveBeenCalledTimes(1);
    expect(mockCalculateGithubMetricsLive).toHaveBeenCalledWith(
      "gh-token",
      group._id.toString(),
      "radiant",
      "rabbits",
      14,
    );

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
    expect(props.timeline).toMatchObject({
      sprintLengthDays: 14,
    });
  });

  // Test 7: test case for sprintLengthWeeks converted correctly (the latest fix) for non-default values
  it("should convert sprintLengthWeeks to days (weeks × 7) when calling the calculator", async () => {
    mockGetServerSession.mockResolvedValue(
      authedSession({ accessToken: "gh-token" }),
    );
    await seedUserWithGroup({ sprintLengthWeeks: 3 });

    mockCalculateGithubMetricsLive.mockResolvedValueOnce({
      totalCommits: 0,
      commitsLastSprint: 0,
      totalPullRequests: 0,
      pullRequestsMergedLastSprint: 0,
      totalIssuesClosed: 0,
      issuesClosedLastSprint: 0,
      activeContributors: 0,
      lastSprintStart: new Date(),
      lastSprintEnd: new Date(),
    });

    const Page = await DashboardPage();
    render(Page);

    const [, , , , sprintLengthDaysArg] =
      mockCalculateGithubMetricsLive.mock.calls[0];
    expect(sprintLengthDaysArg).toBe(21);

    const props = lastDashboardProps();
    expect(props.timeline.sprintLengthDays).toBe(21);
  });

  // Test 8: test case for when sprintLengthWeeks is null
  it("should pass sprintLengthDays=null when the group has no sprintLengthWeeks set", async () => {
    mockGetServerSession.mockResolvedValue(
      authedSession({ accessToken: "gh-token" }),
    );
    await seedUserWithGroup({ sprintLengthWeeks: null });

    mockCalculateGithubMetricsLive.mockResolvedValueOnce({
      totalCommits: 0,
      commitsLastSprint: 0,
      totalPullRequests: 0,
      pullRequestsMergedLastSprint: 0,
      totalIssuesClosed: 0,
      issuesClosedLastSprint: 0,
      activeContributors: 0,
      lastSprintStart: new Date(),
      lastSprintEnd: new Date(),
    });

    const Page = await DashboardPage();
    render(Page);

    const [, , , , sprintLengthDaysArg] =
      mockCalculateGithubMetricsLive.mock.calls[0];
    expect(sprintLengthDaysArg).toBeNull();

    const props = lastDashboardProps();
    expect(props.timeline.sprintLengthDays).toBeNull();
  });
});

// Exercise the real Dashboard component so we can assert on the error StatusBlock
// that renders when the timeline data (sprint length / start / end) is missing or invalid.
describe("DashboardPage — Dashboard renders timeline validation errors", () => {
  const emptyMetrics = {
    totalCommits: 0,
    commitsLastSprint: 0,
    totalPullRequests: 0,
    pullRequestsMergedLastSprint: 0,
    totalIssuesClosed: 0,
    issuesClosedLastSprint: 0,
    activeContributors: 0,
    lastSprintStart: new Date(),
    lastSprintEnd: new Date(),
  };

  beforeEach(() => {
    const RealDashboard = jest.requireActual(
      "@/components/main/Dashboard",
    ).default;
    MockDashboard.mockImplementation(RealDashboard);
    mockGetServerSession.mockResolvedValue(
      authedSession({ accessToken: "gh-token" }),
    );
    mockCalculateGithubMetricsLive.mockResolvedValue(emptyMetrics);
  });

  // Test 9: test case for missing sprintLengthWeeks
  it("should render sprint-length error when the group has no sprintLengthWeeks", async () => {
    await seedUserWithGroup({ sprintLengthWeeks: null });

    const Page = await DashboardPage();
    render(Page);

    expect(
      screen.queryByText(/Sprint length is missing or invalid/i),
    ).not.toBeNull();
  });

  // Test 10: test case for no project timeline (start/end dates)
  it("should render timeline error when the group has no projectStartDate", async () => {
    await seedUserWithGroup({ projectStartDate: null });

    const Page = await DashboardPage();
    render(Page);

    expect(
      screen.queryByText(/Project timeline is missing or invalid/i),
    ).not.toBeNull();
  });
  it("should render timeline error when the group has no projectEndDate", async () => {
    await seedUserWithGroup({ projectEndDate: null });

    const Page = await DashboardPage();
    render(Page);

    expect(
      screen.queryByText(/Project timeline is missing or invalid/i),
    ).not.toBeNull();
  });

  // Test 11: test case for projectEndDate on or before projectStartDate
  it("should render timeline error when projectEndDate is on or before projectStartDate", async () => {
    await seedUserWithGroup({
      projectStartDate: new Date("2026-03-01"),
      projectEndDate: new Date("2026-01-01"),
    });

    const Page = await DashboardPage();
    render(Page);

    expect(
      screen.queryByText(/Project timeline is missing or invalid/i),
    ).not.toBeNull();
  });
});
