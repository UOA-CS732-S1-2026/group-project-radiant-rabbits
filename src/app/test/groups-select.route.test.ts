import { getServerSession } from "next-auth/next";
import { Group, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { POST } from "../api/groups/select/route";

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
  User: {
    findOneAndUpdate: jest.fn(),
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
const mockGroupFindById = Group.findById as unknown as jest.MockedFunction<
  (groupId: string) => Promise<Record<string, unknown> | null>
>;

describe("POST /api/groups/select", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectMongoDB.mockResolvedValue(undefined);
  });

  it("returns 400 for archived groups", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "123" } });
    mockGroupFindById.mockResolvedValue({
      _id: "group-1",
      active: false,
      members: ["123"],
      name: "g",
      repoOwner: "o",
      repoName: "r",
    });

    const response = await POST(
      new Request("http://localhost/api/groups/select", {
        method: "POST",
        body: JSON.stringify({ groupId: "507f191e810c19729de860ea" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Archived groups cannot be selected as current");
  });
});
