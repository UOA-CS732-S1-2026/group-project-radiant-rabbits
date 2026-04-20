import { getServerSession } from "next-auth/next";
import { checkRepoAccess } from "@/app/lib/githubService";
import { Group } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { POST } from "../api/groups/join/route";

// Create a mock for all dependencies used in the route handler
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
  "@/app/lib/models",
  () => ({
    Group: {
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    },
  }),
  { virtual: true },
);

jest.mock("@/app/lib/githubService", () => ({
  checkRepoAccess: jest.fn(),
}));

// Define types for the mocked functions
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
  repoOwner: string;
  repoName: string;
};

// Define the mocked functions with proper types
const mockGetServerSession = getServerSession as unknown as jest.MockedFunction<
  () => Promise<SessionLike>
>;

const mockConnectMongoDB = connectMongoDB as unknown as jest.MockedFunction<
  () => Promise<void>
>;

const mockGroupFindOne = Group.findOne as unknown as jest.MockedFunction<
  (query: Record<string, unknown>) => Promise<GroupLike | null>
>;

const mockGroupFindByIdAndUpdate =
  Group.findByIdAndUpdate as unknown as jest.MockedFunction<
    (
      id: string,
      update: Record<string, unknown>,
      options: Record<string, unknown>,
    ) => Promise<GroupLike>
  >;

const mockCheckRepoAccess = checkRepoAccess as unknown as jest.MockedFunction<
  (token: string, owner: string, repo: string) => Promise<boolean>
>;

// Describe the test suite for the group join route
describe("POST /api/groups/join", () => {
  // Clear all mocks before each test to ensure test isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: test case for unauthenticated user
  it("should return 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: "ABCDEFG1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Authentication required" });
  });

  // Test 2: test case for missing invite code
  it("should return 400 when invite code is missing", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
      accessToken: "token123",
    });

    const request = new Request("http://localhost:3000/api/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invite code is required" });
  });

  // Test 3: test case for group not found
  it("should return 404 when group does not exist", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
      accessToken: "token123",
    });

    mockConnectMongoDB.mockResolvedValue(undefined);

    mockGroupFindOne.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: "ABCDEFG1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Group not found" });
  });

  // Test 4: test case for user already a member
  it("should return 400 when user is already a member", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
      accessToken: "token123",
    });

    mockConnectMongoDB.mockResolvedValue(undefined);

    mockGroupFindOne.mockResolvedValue({
      _id: "group-1",
      members: ["123"],
      repoOwner: "test-owner",
      repoName: "test-name",
    });

    const request = new Request("http://localhost:3000/api/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: "ABCDEFG1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "User is already a member" });
  });

  // Test 5: test case for successful join
  it("should return 200 and updated group on success", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
      accessToken: "token123",
    });

    mockConnectMongoDB.mockResolvedValue(undefined);
    mockCheckRepoAccess.mockResolvedValue(true);

    mockGroupFindOne.mockResolvedValue({
      _id: "group-1",
      members: ["456"],
      repoOwner: "test-owner",
      repoName: "test-name",
    });

    mockGroupFindByIdAndUpdate.mockResolvedValue({
      _id: "group-1",
      members: ["456", "123"],
      repoOwner: "test-owner",
      repoName: "test-name",
    });

    const request = new Request("http://localhost:3000/api/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: "ABCDEFG1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Joined group successfully");
    expect(mockGroupFindByIdAndUpdate).toHaveBeenCalledWith(
      "group-1",
      {
        $addToSet: {
          members: expect.anything(),
        },
      },
      { new: true },
    );
    expect(body.group.members).toEqual(["456", "123"]);
  });

  // Test 6: test case for database error during group lookup
  it("should return 500 on unexpected db errors", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
      accessToken: "token123",
    });

    mockConnectMongoDB.mockResolvedValue(undefined);
    mockGroupFindOne.mockRejectedValue(new Error("db failure"));

    const request = new Request("http://localhost:3000/api/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: "ABCDEFG1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Failed to join group" });
  });

  // Test 7: Test case for missing access token
  it("should return 401 when access token is missing", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
    });

    const request = new Request("http://localhost:3000/api/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: "ABCDEFG1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: "GitHub access token missing. Please sign in again.",
    });
  });

  // Test 8: test case for when the user does not have the right repository access
  it("should return 403 when user lacks repository access", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
      accessToken: "token123",
    });

    mockConnectMongoDB.mockResolvedValue(undefined);
    mockGroupFindOne.mockResolvedValue({
      _id: "group-1",
      members: ["456"],
      repoOwner: "test-owner",
      repoName: "test-repo",
    });
    mockCheckRepoAccess.mockResolvedValue(false);

    const request = new Request("http://localhost:3000/api/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: "ABCDEFG1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: "You do not have access to this GitHub repository.",
    });
  });
});
