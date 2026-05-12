import { getServerSession } from "next-auth/next";
import { Group, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
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
  User: {
    updateMany: jest.fn(),
  },
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

describe("POST /api/groups/[groupId]/archive", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
