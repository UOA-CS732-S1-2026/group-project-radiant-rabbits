import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { Group, Sprint } from "@/app/lib/models";
import {
  generateSprintReviewText,
  SprintReviewAiError,
} from "@/app/lib/sprintReviewService";
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

jest.mock("@/app/lib/sprintReviewService", () => {
  const actual = jest.requireActual("@/app/lib/sprintReviewService");
  return {
    ...actual,
    generateSprintReviewText: jest.fn(),
  };
});

const mockGetServerSession = getServerSession as unknown as jest.MockedFunction<
  () => Promise<{
    user?: {
      id?: string;
    };
  } | null>
>;

const mockGenerateSprintReviewText =
  generateSprintReviewText as jest.MockedFunction<
    typeof generateSprintReviewText
  >;

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "test-sprint-review-route",
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Promise.all([Group.deleteMany({}), Sprint.deleteMany({})]);
  jest.clearAllMocks();
});

async function createMemberGroupAndSprint() {
  const group = await Group.create({
    name: "Test Group",
    description: "Sprint review group",
    inviteCode: "RVWTEST1",
    members: ["user1"],
    createdBy: "user1",
  });

  const sprint = await Sprint.create({
    group: group._id,
    name: "Sprint 1",
    startDate: new Date("2026-04-01T00:00:00.000Z"),
    endDate: new Date("2026-04-14T23:59:59.000Z"),
    status: "ACTIVE",
  });

  return { group, sprint };
}

describe("POST /api/groups/:groupId/sprints/:sprintId/review", () => {
  it("generates and persists a sprint review, then returns cached review", async () => {
    const { group, sprint } = await createMemberGroupAndSprint();
    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    mockGenerateSprintReviewText.mockResolvedValue({
      text: "Sprint Overview\n- Team delivered the endpoint successfully.",
      provider: "openai",
      model: "gpt-4o-mini",
    });

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
    expect(firstBody.review).toContain("Sprint Overview");
    expect(mockGenerateSprintReviewText).toHaveBeenCalledTimes(1);

    const updatedSprint = await Sprint.findById(sprint._id);
    expect(updatedSprint?.aiReview?.text).toContain("Sprint Overview");

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
    expect(mockGenerateSprintReviewText).toHaveBeenCalledTimes(1);
  });

  it("returns 401 when unauthenticated", async () => {
    const { group, sprint } = await createMemberGroupAndSprint();
    mockGetServerSession.mockResolvedValue(null);

    const response = await POST(
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

    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Authentication required" });
  });

  it("returns 404 when sprint does not exist", async () => {
    const { group } = await createMemberGroupAndSprint();
    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const response = await POST(
      new Request(
        `http://localhost/api/groups/${group._id.toString()}/sprints/missing/review`,
        {
          method: "POST",
        },
      ),
      {
        params: Promise.resolve({
          groupId: group._id.toString(),
          sprintId: new mongoose.Types.ObjectId().toString(),
        }),
      },
    );

    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Sprint not found" });
  });

  it("returns 502 when AI generation fails", async () => {
    const { group, sprint } = await createMemberGroupAndSprint();
    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    mockGenerateSprintReviewText.mockRejectedValue(
      new SprintReviewAiError("provider unavailable"),
    );

    const response = await POST(
      new Request(
        `http://localhost/api/groups/${group._id.toString()}/sprints/${sprint._id.toString()}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regenerate: true }),
        },
      ),
      {
        params: Promise.resolve({
          groupId: group._id.toString(),
          sprintId: sprint._id.toString(),
        }),
      },
    );

    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ error: "Failed to generate sprint review" });
  });
});
