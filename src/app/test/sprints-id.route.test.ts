import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { Group, Sprint } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import {
  DELETE,
  GET,
  PUT,
} from "../api/groups/[groupId]/sprints/[sprintId]/route";

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

const mockGetServerSession = getServerSession as unknown as jest.MockedFunction<
  () => Promise<{
    user?: {
      id?: string;
    };
  } | null>
>;

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "test-sprints-id" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Promise.all([Group.deleteMany({}), Sprint.deleteMany({})]);
  jest.clearAllMocks();
});

async function createMemberGroup() {
  return Group.create({
    name: "Test Group",
    description: "Sprint group",
    inviteCode: "SPRINT2",
    members: ["user1"],
    createdBy: "user1",
  });
}

describe("GET /api/groups/:groupId/sprints/:sprintId", () => {
  it("returns 404 when sprint does not exist", async () => {
    const group = await createMemberGroup();
    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const req = new Request(
      `http://localhost/api/groups/${group._id.toString()}/sprints/unknown`,
    );

    const res = await GET(req, {
      params: Promise.resolve({
        groupId: group._id.toString(),
        sprintId: new mongoose.Types.ObjectId().toString(),
      }),
    });

    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body).toEqual({ error: "Sprint not found" });
  });

  it("returns 403 when user is not a member of the group", async () => {
    const group = await Group.create({
      name: "Other Group",
      description: "No members",
      inviteCode: "NOMEM",
      members: [],
      createdBy: "owner",
    });

    const sprint = await Sprint.create({
      name: "Sprint 1",
      group: group._id,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-01-08T00:00:00.000Z"),
    });

    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const req = new Request(
      `http://localhost/api/groups/${group._id.toString()}/sprints/${sprint._id.toString()}`,
    );

    const res = await GET(req, {
      params: Promise.resolve({
        groupId: group._id.toString(),
        sprintId: sprint._id.toString(),
      }),
    });

    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body).toEqual({
      error: "You are not a member of this group",
    });
  });

  it("returns the sprint when it exists and user is member", async () => {
    const group = await createMemberGroup();
    const sprint = await Sprint.create({
      name: "Sprint 1",
      group: group._id,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-01-08T00:00:00.000Z"),
    });

    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const req = new Request(
      `http://localhost/api/groups/${group._id.toString()}/sprints/${sprint._id.toString()}`,
    );

    const res = await GET(req, {
      params: Promise.resolve({
        groupId: group._id.toString(),
        sprintId: sprint._id.toString(),
      }),
    });

    const body = (await res.json()) as { name: string };
    expect(res.status).toBe(200);
    expect(body.name).toBe("Sprint 1");
  });
});

describe("PUT /api/groups/:groupId/sprints/:sprintId", () => {
  it("rejects updates that cause overlap with another sprint", async () => {
    const group = await createMemberGroup();

    const sprint1 = await Sprint.create({
      name: "Sprint 1",
      group: group._id,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-01-08T00:00:00.000Z"),
    });

    const sprint2 = await Sprint.create({
      name: "Sprint 2",
      group: group._id,
      startDate: new Date("2026-01-10T00:00:00.000Z"),
      endDate: new Date("2026-01-17T00:00:00.000Z"),
    });

    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const req = new Request(
      `http://localhost/api/groups/${group._id.toString()}/sprints/${sprint2._id.toString()}`,
      {
        method: "PUT",
        body: JSON.stringify({
          // Move sprint2 to overlap sprint1
          startDate: "2026-01-05T00:00:00.000Z",
          endDate: "2026-01-12T00:00:00.000Z",
        }),
        headers: { "Content-Type": "application/json" },
      },
    );

    const res = await PUT(req, {
      params: Promise.resolve({
        groupId: group._id.toString(),
        sprintId: sprint2._id.toString(),
      }),
    });

    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({
      error: "Sprint dates overlap with an existing sprint",
    });

    const unchanged = await Sprint.findById(sprint2._id);
    expect(unchanged?.startDate.toISOString()).toBe("2026-01-10T00:00:00.000Z");
  });

  it("updates sprint when dates are valid and non-overlapping", async () => {
    const group = await createMemberGroup();

    const sprint = await Sprint.create({
      name: "Sprint 1",
      group: group._id,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-01-08T00:00:00.000Z"),
    });

    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const req = new Request(
      `http://localhost/api/groups/${group._id.toString()}/sprints/${sprint._id.toString()}`,
      {
        method: "PUT",
        body: JSON.stringify({
          name: "Updated",
          startDate: "2026-01-02T00:00:00.000Z",
          endDate: "2026-01-09T00:00:00.000Z",
        }),
        headers: { "Content-Type": "application/json" },
      },
    );

    const res = await PUT(req, {
      params: Promise.resolve({
        groupId: group._id.toString(),
        sprintId: sprint._id.toString(),
      }),
    });

    const body = (await res.json()) as { name: string };
    expect(res.status).toBe(200);
    expect(body.name).toBe("Updated");

    const updated = await Sprint.findById(sprint._id);
    expect(updated?.name).toBe("Updated");
  });
});

describe("DELETE /api/groups/:groupId/sprints/:sprintId", () => {
  it("returns 204 and removes the sprint", async () => {
    const group = await createMemberGroup();

    const sprint = await Sprint.create({
      name: "Sprint 1",
      group: group._id,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-01-08T00:00:00.000Z"),
    });

    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const req = new Request(
      `http://localhost/api/groups/${group._id.toString()}/sprints/${sprint._id.toString()}`,
      {
        method: "DELETE",
      },
    );

    const res = await DELETE(req, {
      params: Promise.resolve({
        groupId: group._id.toString(),
        sprintId: sprint._id.toString(),
      }),
    });

    expect(res.status).toBe(204);

    const inDb = await Sprint.findById(sprint._id);
    expect(inDb).toBeNull();
  });
});
