jest.mock("@/app/lib/mongodbConnection", () => jest.fn());

const mockSprint = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
};

jest.mock("@/app/lib/models", () => ({
  Sprint: mockSprint,
}));

import { POST } from "@/app/api/groups/[groupId]/sprints/transition/route";
import { Sprint } from "@/app/lib/models";

describe("POST /api/groups/[groupId]/sprints/transition", () => {
  const mockGroupId = "group_abc";
  const mockCurrentSprintId = "sprint_7";
  const params = Promise.resolve({ groupId: mockGroupId });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should successfully transition from current to next sprint", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        currentSprintId: mockCurrentSprintId,
      }),
    });

    (Sprint.findOne as jest.Mock).mockResolvedValue({
      _id: mockCurrentSprintId,
      group: mockGroupId,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      status: "ACTIVE",
    });
    (Sprint.findOneAndUpdate as jest.Mock).mockResolvedValue({
      _id: "sprint_8",
      status: "ACTIVE",
    });
    (Sprint.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });

    const response = await POST(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    expect(Sprint.findOne).toHaveBeenCalledWith({
      _id: mockCurrentSprintId,
      group: mockGroupId,
    });
    expect(Sprint.findOneAndUpdate).toHaveBeenCalledWith(
      {
        group: mockGroupId,
        startDate: {
          $gt: new Date("2026-01-01T00:00:00.000Z"),
        },
        status: "PLANNING",
      },
      { $set: { status: "ACTIVE", isCurrent: true } },
      {
        sort: { startDate: 1 },
        returnDocument: "after",
      },
    );
    expect(Sprint.updateOne).toHaveBeenCalledWith(
      { _id: mockCurrentSprintId },
      { $set: { status: "COMPLETED", isCurrent: false } },
    );
  });

  it("should return 404 if the current sprint is not found", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        currentSprintId: mockCurrentSprintId,
      }),
    });

    (Sprint.findOne as jest.Mock).mockResolvedValue(null);

    const response = await POST(req, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Current sprint not found");
    expect(Sprint.findOneAndUpdate).not.toHaveBeenCalled();
    expect(Sprint.updateOne).not.toHaveBeenCalled();
  });

  it("should return 404 if the next planning sprint is not found", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        currentSprintId: mockCurrentSprintId,
      }),
    });

    (Sprint.findOne as jest.Mock).mockResolvedValue({
      _id: mockCurrentSprintId,
      group: mockGroupId,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      status: "ACTIVE",
    });
    (Sprint.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

    const response = await POST(req, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Next planning sprint not found");
    expect(console.error).toHaveBeenCalled();
    expect(Sprint.updateOne).not.toHaveBeenCalled();
  });

  it("should return 500 if a database error occurs", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        currentSprintId: mockCurrentSprintId,
      }),
    });

    (Sprint.findOne as jest.Mock).mockRejectedValue(new Error("DB failed"));

    const response = await POST(req, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Server Error");
  });
});
