import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { Group, Sprint } from "@/app/lib/models";
import { GET, POST } from "../api/groups/[groupId]/sprints/route";

// Mock next-auth session and the MongoDB connection helper.
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
  await mongoose.connect(mongoServer.getUri(), { dbName: "test-sprints" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Promise.all([Group.deleteMany({}), Sprint.deleteMany({})]);
  jest.clearAllMocks();
});

async function createMemberGroup(
  overrides: Partial<{ members: string[] }> = {},
) {
  return Group.create({
    name: "Test Group",
    description: "Sprint group",
    inviteCode: "SPRINT1",
    members: ["user1", ...(overrides.members ?? [])],
    createdBy: "user1",
  });
}

describe("POST /api/groups/:groupId/sprints", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/groups/123/sprints", {
      method: "POST",
      body: JSON.stringify({
        name: "Sprint 1",
        startDate: "2026-01-01T00:00:00.000Z",
        endDate: "2026-01-08T00:00:00.000Z",
      }),
      headers: { "Content-Type": "application/json" },
    });

    // params is an async object in app router handlers
    const res = await POST(req, {
      params: Promise.resolve({ groupId: "123" }),
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Authentication required" });
  });

  it("creates a sprint when payload is valid and no overlap", async () => {
    const group = await createMemberGroup();

    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const req = new Request(
      `http://localhost/api/groups/${group._id.toString()}/sprints`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Sprint 1",
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-01-08T00:00:00.000Z",
        }),
        headers: { "Content-Type": "application/json" },
      },
    );

    const res = await POST(req, {
      params: Promise.resolve({ groupId: group._id.toString() }),
    });

    expect(res.status).toBe(201);
    const created = (await res.json()) as { name: string };
    expect(created.name).toBe("Sprint 1");

    const inDb = await Sprint.find({ group: group._id });
    expect(inDb).toHaveLength(1);
  });

  it("returns 400 when startDate or endDate is missing", async () => {
    const group = await createMemberGroup();

    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const req = new Request(
      `http://localhost/api/groups/${group._id.toString()}/sprints`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Sprint 1",
          startDate: "2026-01-01T00:00:00.000Z",
          // endDate missing
        }),
        headers: { "Content-Type": "application/json" },
      },
    );

    const res = await POST(req, {
      params: Promise.resolve({ groupId: group._id.toString() }),
    });

    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({
      error: "startDate and endDate are required",
    });
  });

  it("returns 400 when endDate is not after startDate", async () => {
    const group = await createMemberGroup();

    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const req = new Request(
      `http://localhost/api/groups/${group._id.toString()}/sprints`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Sprint 1",
          startDate: "2026-01-08T00:00:00.000Z",
          endDate: "2026-01-08T00:00:00.000Z",
        }),
        headers: { "Content-Type": "application/json" },
      },
    );

    const res = await POST(req, {
      params: Promise.resolve({ groupId: group._id.toString() }),
    });

    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({
      error: "endDate must be later than startDate",
    });
  });

  it("rejects overlapping sprints for the same group", async () => {
    const group = await createMemberGroup();

    // Existing sprint: Jan 3 - Jan 10
    await Sprint.create({
      name: "Existing",
      group: group._id,
      startDate: new Date("2026-01-03T00:00:00.000Z"),
      endDate: new Date("2026-01-10T00:00:00.000Z"),
    });

    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const req = new Request(
      `http://localhost/api/groups/${group._id.toString()}/sprints`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Overlapping Sprint",
          // Overlaps: starts before existing.end and ends after existing.start
          startDate: "2026-01-05T00:00:00.000Z",
          endDate: "2026-01-12T00:00:00.000Z",
        }),
        headers: { "Content-Type": "application/json" },
      },
    );

    const res = await POST(req, {
      params: Promise.resolve({ groupId: group._id.toString() }),
    });

    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({
      error: "Sprint dates overlap with an existing sprint",
    });
  });
});

describe("GET /api/groups/:groupId/sprints", () => {
  it("returns empty array when user is not a member", async () => {
    const group = await createMemberGroup({ members: [] });

    mockGetServerSession.mockResolvedValue({ user: { id: "someone-else" } });

    const req = new Request(
      `http://localhost/api/groups/${group._id.toString()}/sprints`,
    );

    const res = await GET(req, {
      params: Promise.resolve({ groupId: group._id.toString() }),
    });

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });

  it("returns sprints sorted by startDate desc for members", async () => {
    const group = await createMemberGroup();

    await Sprint.create([
      {
        name: "Old Sprint",
        group: group._id,
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-01-08T00:00:00.000Z"),
      },
      {
        name: "New Sprint",
        group: group._id,
        startDate: new Date("2026-02-01T00:00:00.000Z"),
        endDate: new Date("2026-02-08T00:00:00.000Z"),
      },
    ]);

    mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });

    const req = new Request(
      `http://localhost/api/groups/${group._id.toString()}/sprints?limit=10&offset=0`,
    );

    const res = await GET(req, {
      params: Promise.resolve({ groupId: group._id.toString() }),
    });

    const body = (await res.json()) as { name: string }[];
    expect(res.status).toBe(200);
    expect(body.map((s) => s.name)).toEqual(["New Sprint", "Old Sprint"]);
  });
});
