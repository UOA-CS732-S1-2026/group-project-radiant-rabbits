import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { GET } from "@/app/api/groups/[groupId]/sprints/[sprintId]/tasks/route";
import { Group, Sprint, SprintTask } from "@/app/lib/models";
import { isUserInGroup } from "@/app/lib/userRef";

// Mock dependencies
jest.mock("next-auth/next");
jest.mock("@/app/api/auth/[...nextauth]/options", () => ({ options: {} }));
jest.mock("@/app/lib/mongodbConnection", () => jest.fn());
jest.mock("@/app/lib/models");
jest.mock("@/app/lib/userRef");
jest.mock("@/app/lib/currentSprintService", () => ({
  avatarUrlForLogin: jest.fn((name) => `url-${name}`),
}));

describe("GET /api/groups/[groupId]/sprints/[sprintId]/tasks", () => {
  const mockGroupId = "group123";
  const mockSprintId = "sprint456";
  const mockUserId = "user789";

  const params = Promise.resolve({
    groupId: mockGroupId,
    sprintId: mockSprintId,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 404 if group is not found", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: mockUserId },
    });
    (Group.findById as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Group not found");
  });

  it("should return 403 if user is not a member of the group", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: mockUserId },
    });
    (Group.findById as jest.Mock).mockResolvedValue({ members: [] });
    (isUserInGroup as jest.Mock).mockReturnValue(false);

    const response = await GET(new Request("http://localhost"), { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("You are not a member of this group");
  });

  it("should return 404 if sprint is not found", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: mockUserId },
    });
    (Group.findById as jest.Mock).mockResolvedValue({
      _id: mockGroupId,
      members: [],
    });
    (isUserInGroup as jest.Mock).mockReturnValue(true);
    (Sprint.findOne as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Sprint not found");
  });

  it("should return tasks and breakdown on success", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: mockUserId },
    });
    (Group.findById as jest.Mock).mockResolvedValue({
      _id: mockGroupId,
      members: [],
    });
    (isUserInGroup as jest.Mock).mockReturnValue(true);
    (Sprint.findOne as jest.Mock).mockResolvedValue({ _id: mockSprintId });

    const mockTasks = [
      {
        _id: "t1",
        title: "Task 1",
        status: "DONE",
        assignees: ["Alice"],
        issueNumber: 101,
      },
      {
        _id: "t2",
        title: "Task 2",
        status: "TODO",
        assignees: ["Bob"],
        issueNumber: null,
      },
    ];

    const mockFind = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockTasks),
    };
    (SprintTask.find as jest.Mock).mockReturnValue(mockFind);

    const response = await GET(new Request("http://localhost"), { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tasks).toHaveLength(2);
    expect(data.breakdown).toEqual({ todo: 1, inProgress: 0, done: 1 });
    expect(data.tasks[0].assignees[0].avatarUrl).toBe("url-Alice");
  });

  it("should return 500 if a database error occurs", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: mockUserId },
    });
    (Group.findById as jest.Mock).mockRejectedValue(new Error("DB Error"));

    const response = await GET(new Request("http://localhost"), { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch sprint tasks");
  });
});
