import { group } from "console";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { PUT } from "@/app/api/groups/leave/route";
import { Group, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { isUserInGroup } from "@/app/lib/userRef";

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

jest.mock(
  "@/app/lib/userRef",
  () => ({
    isUserInGroup: jest.fn(),
  }),
  { virtual: true },
);

jest.mock("@/app/lib/models", () => ({
  Group: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
  User: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

type SessionLike = {
  user?: {
    id?: string;
    name?: string;
  };
  accessToken?: string;
} | null;

type GroupLike = {
  _id: string;
  members: string[];
};

type UserLike = {
  githubId: string;
  currentGroupId?: string;
};

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

const mockConnectMongoDB = connectMongoDB as jest.MockedFunction<
  typeof connectMongoDB
>;

const mockGroupFindById = Group.findById as jest.MockedFunction<
  typeof Group.findById
>;

const mockUserFindById = User.findById as jest.MockedFunction<
  typeof User.findById
>;

const mockUserFindByIdAndUpdate = User.findByIdAndUpdate as jest.MockedFunction<
  typeof User.findByIdAndUpdate
>;

const mockIsUserInGroup = isUserInGroup as jest.MockedFunction<
  typeof isUserInGroup
>;

describe("PUT /api/groups/leave", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test case 1: User not authenticated
  it("should return 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/groups/leave", {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Authentication required" });
  });

  // Test case 2: User authenticated but missing access token
  it("should return 401 when access token is missing", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
    });

    const request = new Request("http://localhost:3000/api/groups/leave", {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: "GitHub access token missing. Please sign in again.",
    });
  });

  // Test case 3: User not found in database
  it("should return 404 if user not found in database", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
      accessToken: "token123",
    });

    mockConnectMongoDB.mockResolvedValue(undefined);

    mockUserFindById.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/groups/leave", {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "User not found" });
  });

  // Test case 4: User does not have a currentGroupId
  it("should return 400 if the user does not have a current group assignment", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
      accessToken: "token123",
    });

    mockConnectMongoDB.mockResolvedValue(undefined);
    mockUserFindById.mockResolvedValue({
      _id: "mongo-user-id-123",
      githubId: "123",
    });

    const request = new Request("http://localhost:3000/api/groups/leave", {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "You are not currently in a group" });
  });

  // Test case 5: CurrentGroup not found in database
  it("should return 404 if the user's current group is not found in database", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
      accessToken: "token123",
    });

    mockConnectMongoDB.mockResolvedValue(undefined);
    mockUserFindById.mockResolvedValue({
      _id: "mongo-user-id-123",
      githubId: "123",
      currentGroupId: "group-1",
    });
    mockGroupFindById.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/groups/leave", {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Group not found" });
  });

  // Test case 6: User authenticated but not in the group they are trying to leave
  it("should return 403 when user is not a member of the group", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
      accessToken: "token123",
    });

    mockConnectMongoDB.mockResolvedValue(undefined);

    mockGroupFindById.mockResolvedValue({
      _id: "group-1",
      members: ["456"],
      repoOwner: "test-owner",
      repoName: "test-name",
    });

    mockIsUserInGroup.mockReturnValue(false);

    const request = new Request("http://localhost:3000/api/groups/leave", {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "You are not a member of this group" });
  });

  // Test case 7: Successful group leave
  it("should return 200 when user successfully leaves the group", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "mongo-user-id-123", name: "Test" },
      accessToken: "token123",
    });

    mockConnectMongoDB.mockResolvedValue(undefined);

    mockUserFindById.mockResolvedValue({
      _id: "mongo-user-id-123",
      githubId: "123",
      currentGroupId: "group-1",
    });

    mockGroupFindById.mockResolvedValue({
      _id: "group-1",
      members: ["123", "456"],
      repoOwner: "test-owner",
      repoName: "test-name",
    });

    mockIsUserInGroup.mockReturnValue(true);

    mockUserFindByIdAndUpdate.mockResolvedValue({
      _id: "mongo-user-id-123",
      githubId: "123",
    });

    const request = new Request("http://localhost:3000/api/groups/leave", {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(Group.findByIdAndUpdate).toHaveBeenCalledWith(
      "group-1",
      { $pull: { members: "mongo-user-id-123" } },
      { new: true },
    );

    expect(response.status).toBe(200);
    expect(body).toEqual({ message: "Successfully left the group" });

    expect(Group.findByIdAndDelete).not.toHaveBeenCalled();
  });

  // Test case 8: Database connection error
  it("should return 500 if there is a database connection error", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
      accessToken: "token123",
    });
    mockConnectMongoDB.mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = new Request("http://localhost:3000/api/groups/leave", {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Failed to leave group" });

    consoleSpy.mockRestore();
  });

  // Test case 9: Group has no members left after user leaves, group should be deleted
  it("should return 200 and delete the group if there are no members left after user leaves", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "mongo-user-id-123", name: "Test" },
      accessToken: "token123",
    });

    mockConnectMongoDB.mockResolvedValue(undefined);

    mockUserFindById.mockResolvedValue({
      _id: "mongo-user-id-123",
      githubId: "123",
      currentGroupId: "group-1",
    });

    mockGroupFindById.mockResolvedValue({
      _id: "group-1",
      members: ["123"],
      repoOwner: "test-owner",
      repoName: "test-name",
    });

    mockIsUserInGroup.mockReturnValue(true);

    (Group.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      _id: "group-1",
      members: [],
    });

    const request = new Request("http://localhost:3000/api/groups/leave", {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(Group.findByIdAndUpdate).toHaveBeenCalledWith(
      "group-1",
      { $pull: { members: "mongo-user-id-123" } },
      { new: true },
    );
    expect(response.status).toBe(200);
    expect(body).toEqual({ message: "Successfully left the group" });
    expect(Group.findByIdAndDelete).toHaveBeenCalledWith("group-1");
  });
});
