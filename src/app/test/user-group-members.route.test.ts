import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { Group, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { GET } from "../api/user/group-members/route";

// Mock auth session lookup.
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

// Mock DB connection helper.
jest.mock(
  "@/app/lib/mongodbConnection",
  () => ({
    __esModule: true,
    default: jest.fn(),
  }),
  { virtual: true },
);

// Mock group and user model methods used by the route.
jest.mock("@/app/lib/models", () => ({
  Group: {
    findOne: jest.fn(),
  },
  User: {
    find: jest.fn(),
  },
}));

type SessionLike = {
  user?: {
    id?: string;
  };
} | null;

const mockGetServerSession = getServerSession as unknown as jest.MockedFunction<
  () => Promise<SessionLike>
>;

const mockConnectMongoDB = connectMongoDB as unknown as jest.MockedFunction<
  () => Promise<void>
>;

const mockGroupFindOne = Group.findOne as unknown as jest.MockedFunction<
  (query: Record<string, unknown>) => {
    sort: (sortQuery: Record<string, unknown>) => {
      lean: () => Promise<Record<string, unknown> | null>;
    };
  }
>;

const mockUserFind = User.find as unknown as jest.MockedFunction<
  (
    query: Record<string, unknown>,
    projection: Record<string, unknown>,
  ) => { lean: () => Promise<Array<Record<string, unknown>>> }
>;

describe("GET /api/user/group-members", () => {
  beforeEach(() => {
    // Reset mocks so each test runs independently.
    jest.clearAllMocks();
    mockConnectMongoDB.mockResolvedValue(undefined);
  });

  it("returns 401 for unauthenticated users", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/user/group-members");

    const response = await GET(request as unknown as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Authentication required" });
  });

  it("returns empty state when user has no group", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "123" } });

    mockGroupFindOne.mockReturnValue({
      sort: () => ({
        lean: async () => null,
      }),
    });

    const request = new Request("http://localhost:3000/api/user/group-members");

    const response = await GET(request as unknown as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ group: null, members: [] });
    expect(mockConnectMongoDB).toHaveBeenCalledTimes(1);
  });

  it("returns group members with profile fallback values", async () => {
    // Group has 2 members, but only one has a profile record.
    mockGetServerSession.mockResolvedValue({
      user: { id: "507f191e810c19729de860ea" },
    });

    mockGroupFindOne.mockReturnValue({
      sort: () => ({
        lean: async () => ({
          _id: "group-1",
          name: "Repo Team",
          description: "Group description",
          inviteCode: "ABCD1234",
          repoOwner: "radiant-rabbits",
          repoName: "group-project",
          members: ["507f191e810c19729de860ea", "507f191e810c19729de860eb"],
        }),
      }),
    });

    mockUserFind.mockReturnValue({
      lean: async () => [
        {
          _id: "507f191e810c19729de860ea",
          name: "Nancy",
          login: "nancyGH",
          email: "nancy@example.com",
          avatarUrl: "https://example.com/avatar.png",
        },
      ],
    });

    const request = new Request("http://localhost:3000/api/user/group-members");

    const response = await GET(request as unknown as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.group.name).toBe("Repo Team");
    expect(body.group.memberCount).toBe(2);
    expect(body.members).toHaveLength(2);
    expect(body.members[0]).toMatchObject({
      id: "507f191e810c19729de860ea",
      name: "Nancy",
      login: "nancyGH",
      email: "nancy@example.com",
      avatarUrl: "https://example.com/avatar.png",
    });
    // Missing profile falls back to generated display name.
    expect(body.members[1].name).toBe("Member 507f191e");
  });
});
