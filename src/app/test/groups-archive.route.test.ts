import { getServerSession } from "next-auth/next";
import { Group, Sprint, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import {
  aggregateSprintReviewData,
  buildSprintReviewPrompt,
  generateSprintReviewText,
} from "@/app/lib/sprintReviewService";
import { POST } from "../api/groups/[groupId]/archive/route";

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

jest.mock(
  "@/app/lib/mongodbConnection",
  () => ({
    __esModule: true,
    default: jest.fn(),
  }),
  { virtual: true },
);

jest.mock("@/app/lib/models", () => ({
  Group: {
    findById: jest.fn(),
  },
  Sprint: {
    findOne: jest.fn(),
  },
  User: {
    updateMany: jest.fn(),
  },
}));

jest.mock("@/app/lib/sprintReviewService", () => ({
  aggregateSprintReviewData: jest.fn(),
  buildSprintReviewPrompt: jest.fn(),
  generateSprintReviewText: jest.fn(),
}));

type SessionLike = {
  user?: {
    id?: string;
  };
} | null;

type GroupLike = {
  _id: string;
  members: string[];
  createdBy: string;
  active: boolean;
  save: jest.Mock<Promise<void>, []>;
};

type SprintLike = {
  _id: string;
  aiReview?: { text?: string | null } | null;
  status: "PLANNING" | "ACTIVE" | "COMPLETED";
  isCurrent: boolean;
  save: jest.Mock<Promise<void>, []>;
};

const mockGetServerSession = getServerSession as unknown as jest.MockedFunction<
  () => Promise<SessionLike>
>;
const mockConnectMongoDB = connectMongoDB as unknown as jest.MockedFunction<
  () => Promise<void>
>;
const mockGroupFindById = Group.findById as unknown as jest.MockedFunction<
  (groupId: string) => Promise<GroupLike | null>
>;
const mockUserUpdateMany = User.updateMany as unknown as jest.MockedFunction<
  (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ) => Promise<unknown>
>;
const mockSprintFindOne = Sprint.findOne as unknown as jest.MockedFunction<
  (filter: Record<string, unknown>) => {
    sort: () => Promise<SprintLike | null>;
  }
>;
const mockAggregateSprintReviewData =
  aggregateSprintReviewData as jest.MockedFunction<
    typeof aggregateSprintReviewData
  >;
const mockBuildSprintReviewPrompt =
  buildSprintReviewPrompt as jest.MockedFunction<
    typeof buildSprintReviewPrompt
  >;
const mockGenerateSprintReviewText =
  generateSprintReviewText as jest.MockedFunction<
    typeof generateSprintReviewText
  >;

describe("POST /api/groups/[groupId]/archive", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSprintFindOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    });
    mockAggregateSprintReviewData.mockResolvedValue({
      sprint: {
        id: "sprint-1",
        name: "Sprint 1",
        status: "ACTIVE",
        goal: "Goal",
        isCurrent: true,
        startDate: new Date("2026-01-01").toISOString(),
        endDate: new Date("2026-01-14").toISOString(),
      },
      group: {
        id: "group-1",
        name: "Group",
        description: "Desc",
        repoOwner: null,
        repoName: null,
      },
      members: [],
      metrics: {
        commitCount: 0,
        issuesOpened: 0,
        issuesClosed: 0,
        pullRequestsOpened: 0,
        pullRequestsMerged: 0,
        tasksTotal: 0,
        tasksTodo: 0,
        tasksInProgress: 0,
        tasksDone: 0,
      },
      tasks: [],
      topContributors: [],
      highlights: {
        recentCommits: [],
        recentIssuesOpened: [],
        recentIssuesClosed: [],
        recentPullRequestsOpened: [],
        recentPullRequestsMerged: [],
      },
    });
    mockBuildSprintReviewPrompt.mockReturnValue("prompt");
    mockGenerateSprintReviewText.mockResolvedValue({
      text: "review",
      provider: "openai",
      model: "gpt-4o-mini",
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ groupId: "507f191e810c19729de860ea" }),
    });
    expect(response.status).toBe(401);
  });

  it("archives active group and clears currentGroupId for users", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "507f191e810c19729de860ea" },
    });
    mockConnectMongoDB.mockResolvedValue(undefined);

    const save = jest.fn().mockResolvedValue(undefined);
    mockGroupFindById.mockResolvedValue({
      _id: "group-1",
      members: ["507f191e810c19729de860ea"],
      createdBy: "507f191e810c19729de860ea",
      active: true,
      save,
    });
    mockUserUpdateMany.mockResolvedValue({});

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ groupId: "507f191e810c19729de860eb" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ message: "Group archived successfully" });
    expect(save).toHaveBeenCalledTimes(1);
    expect(mockSprintFindOne).toHaveBeenCalled();
    expect(mockUserUpdateMany).toHaveBeenCalledWith(
      { currentGroupId: "group-1" },
      { $set: { currentGroupId: null } },
    );
  });

  it("allows a member who is not the group creator to archive the group", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "507f191e810c19729de860ea" },
    });
    mockConnectMongoDB.mockResolvedValue(undefined);
    const save = jest.fn().mockResolvedValue(undefined);
    mockGroupFindById.mockResolvedValue({
      _id: "group-1",
      members: ["507f191e810c19729de860ea"],
      createdBy: "507f191e810c19729de860ff",
      active: true,
      save,
    });
    mockUserUpdateMany.mockResolvedValue({});

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ groupId: "507f191e810c19729de860eb" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ message: "Group archived successfully" });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("auto-generates a review and completes the current sprint when archiving", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "507f191e810c19729de860ea" },
    });
    mockConnectMongoDB.mockResolvedValue(undefined);

    const groupSave = jest.fn().mockResolvedValue(undefined);
    mockGroupFindById.mockResolvedValue({
      _id: "group-1",
      members: ["507f191e810c19729de860ea"],
      createdBy: "507f191e810c19729de860ea",
      active: true,
      save: groupSave,
    });

    const sprintSave = jest.fn().mockResolvedValue(undefined);
    const sprint: SprintLike = {
      _id: "sprint-1",
      aiReview: null,
      status: "ACTIVE",
      isCurrent: true,
      save: sprintSave,
    };
    mockSprintFindOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(sprint),
    });
    mockUserUpdateMany.mockResolvedValue({});

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ groupId: "507f191e810c19729de860eb" }),
    });

    expect(response.status).toBe(200);
    expect(mockAggregateSprintReviewData).toHaveBeenCalled();
    expect(mockBuildSprintReviewPrompt).toHaveBeenCalled();
    expect(mockGenerateSprintReviewText).toHaveBeenCalled();
    expect(sprint.status).toBe("COMPLETED");
    expect(sprint.isCurrent).toBe(false);
    expect(sprint.aiReview?.text).toBe("review");
    expect(sprintSave).toHaveBeenCalledTimes(1);
    expect(groupSave).toHaveBeenCalledTimes(1);
  });
});
