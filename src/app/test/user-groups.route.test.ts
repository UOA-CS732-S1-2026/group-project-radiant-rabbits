import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { Group } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { GET } from "../api/user/groups/route";

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
    find: jest.fn(),
  },
}));

const mockGetServerSession = getServerSession as unknown as jest.MockedFunction<
  () => Promise<{ user?: { id?: string }; accessToken?: string } | null>
>;
const mockConnectMongoDB = connectMongoDB as unknown as jest.MockedFunction<
  () => Promise<void>
>;
const mockGroupFind = Group.find as unknown as jest.MockedFunction<
  (query: Record<string, unknown>) => { lean: () => Promise<unknown[]> }
>;

describe("GET /api/user/groups", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectMongoDB.mockResolvedValue(undefined);
  });

  it("includes active flag for current groups", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "507f191e810c19729de860ea" },
      accessToken: "gh-token",
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, name: "rabbits", owner: { login: "radiant" } },
        { id: 2, name: "other", owner: { login: "radiant" } },
      ],
    }) as jest.Mock;

    mockGroupFind.mockReturnValue({
      lean: async () => [
        {
          _id: { toString: () => "g1" },
          repoName: "rabbits",
          repoOwner: "radiant",
          inviteCode: "ABCDEFG1",
          members: ["507f191e810c19729de860ea"],
          active: false,
        },
      ],
    });

    const response = await GET(
      new Request("http://localhost/api/user/groups") as NextRequest,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.currentGroups).toEqual([
      {
        id: "g1",
        name: "rabbits",
        repoOwner: "radiant",
        active: false,
      },
    ]);
  });
});
