import { NextResponse } from "next/server";
import { POST } from "@/app/api/groups/[groupId]/sprints/transition/route";
import { Sprint } from "@/app/lib/models";

jest.mock("@/app/lib/mongodbConnection", () => jest.fn());
jest.mock("@/app/lib/models");

describe("POST /api/groups/[groupId]/sprints/transition", () => {
  const mockGroupId = "group_abc";
  const mockCurrentSprintId = "sprint_7";
  const mockNextSprintNumber = 8;

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
        nextSprintNumber: mockNextSprintNumber,
      }),
    });

    (Sprint.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });
    (Sprint.findOneAndUpdate as jest.Mock).mockResolvedValue({
      _id: "sprint_8",
      status: "ACTIVE",
    });

    const response = await POST(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    expect(Sprint.updateOne).toHaveBeenCalledWith(
      { _id: mockCurrentSprintId },
      { $set: { status: "COMPLETED", isCurrent: false } },
    );

    expect(Sprint.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        group: mockGroupId,
        status: "PLANNING",
        name: expect.any(RegExp),
      }),
      { $set: { status: "ACTIVE", isCurrent: true } },
      { returnDocument: "after" },
    );
  });

  it("should return 404 if the next planning sprint is not found", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        currentSprintId: mockCurrentSprintId,
        nextSprintNumber: 99,
      }),
    });

    (Sprint.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });
    (Sprint.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

    const response = await POST(req, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Next planning sprint not found");
    expect(console.error).toHaveBeenCalled();
  });

  it("should return 500 if a database error occurs", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        currentSprintId: mockCurrentSprintId,
        nextSprintNumber: mockNextSprintNumber,
      }),
    });

    (Sprint.updateOne as jest.Mock).mockRejectedValue(
      new Error("Update failed"),
    );

    const response = await POST(req, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Server Error");
  });
});
