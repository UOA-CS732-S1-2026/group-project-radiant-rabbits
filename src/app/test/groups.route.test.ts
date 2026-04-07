import { group } from "console";
import { getServerSession } from "next-auth/next";
import { checkRepoAccess } from "@/app/lib/githubService";
import { Group } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { triggerSync } from "@/app/lib/syncService";
import { POST } from "../api/groups/route";

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

jest.mock("@/app/lib/models", () => ({
  Group: {
    create: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock("@/app/lib/githubService", () => ({
  checkRepoAccess: jest.fn(),
}));

jest.mock("@/app/lib/syncService", () => ({
  triggerSync: jest.fn(),
}));

// Define types for the mocked functions
type SessionLike = {
  user?: {
    id?: string;
    name?: string;
  };
  accessToken?: string;
} | null;

// Define the mocked functions with proper types
const mockGetServerSession = getServerSession as unknown as jest.MockedFunction<
  () => Promise<SessionLike>
>;

const mockConnectMongoDB = connectMongoDB as unknown as jest.MockedFunction<
  () => Promise<void>
>;

const mockGroupCreate = Group.create as unknown as jest.MockedFunction<
  (doc: Record<string, unknown>) => Promise<Record<string, unknown>>
>;

const mockGroupFindOne = Group.findOne as unknown as jest.MockedFunction<
  (query: Record<string, unknown>) => Promise<Record<string, unknown> | null>
>;

const mockCheckRepoAccess = checkRepoAccess as unknown as jest.MockedFunction<
  (token: string, owner: string, repo: string) => Promise<boolean>
>;

const mockTriggerSync = triggerSync as unknown as jest.MockedFunction<
  (groupId: string, token: string) => void
>;

// Describe the test suite for the group creation route
describe("POST /api/groups", () => {
  // Clear all mocks before each test to ensure test isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: test case for unauthenticated user
  it("should return 401 if user is not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/groups", {
      method: "POST",
      body: JSON.stringify({ name: "Test Group", description: "Tester" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Authentication required" });
  });

  // Test 2: test case for missing required fields
  it("should return 400 when required fields are missing", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
      accessToken: "token123",
    });

    const request = new Request("http://localhost:3000/api/groups", {
      method: "POST",
      body: JSON.stringify({ name: "", description: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Name and description is required" });
  });

  // Test 3: test case for successful group creation
  it("should create and return a group when payload is valid", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
      accessToken: "token123",
    });

    mockConnectMongoDB.mockResolvedValue(undefined);
    mockGroupFindOne.mockResolvedValue(null);
    mockCheckRepoAccess.mockResolvedValue(true);

    mockGroupCreate.mockResolvedValue({
      _id: "new-group-id",
      name: "Test Group",
      description: "This is a test group",
      inviteCode: "ABCDEFG1",
      members: ["123"],
      repoOwner: "test-owner",
      repoName: "test-name",
      createdBy: "123",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSyncAt: new Date(),
      syncStatus: "pending",
      syncError: null,
    });

    const request = new Request("http://localhost:3000/api/groups", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Group",
        description: "This is a test group",
        repoOwner: "test-owner",
        repoName: "test-name",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.message).toBe("Group Successfully Created");
    expect(body.group.name).toBe("Test Group");
    expect(body.group.description).toBe("This is a test group");
    expect(body.group.createdBy).toBe("123");
    expect(mockConnectMongoDB).toHaveBeenCalledTimes(1);
    expect(mockGroupCreate).toHaveBeenCalledTimes(1);
    expect(mockTriggerSync).toHaveBeenCalledWith("new-group-id", "token123");
  });

  // Test 4: Missing access token (unauthenticated user)
  it("should return 401 if user is missing access token", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
    });

    const request = new Request("http://localhost:3000/api/groups", {
      method: "POST",
      body: JSON.stringify({ name: "Test Group", description: "Tester" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: "GitHub access token missing. Please sign in again.",
    });
  });

  // Test 5: test case for if a group is already linked to the repository
  it("should return 409 if the repository is already linked to a group", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
      accessToken: "token123",
    });

    mockConnectMongoDB.mockResolvedValue(undefined);
    mockGroupFindOne.mockResolvedValue({ _id: "existing-group" });

    const request = new Request("http://localhost:3000/api/groups", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Group",
        description: "Tester",
        repoOwner: "owner",
        repoName: "repo",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: "A group already exists for this repository",
    });
  });

  // Test 6: test case for if the user doesn't have repository access for the group
  it("should return 403 if user lacks repository access", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "123", name: "Test" },
      accessToken: "token123",
    });

    mockConnectMongoDB.mockResolvedValue(undefined);
    mockGroupFindOne.mockResolvedValue(null);
    mockCheckRepoAccess.mockResolvedValue(false);

    const request = new Request("http://localhost:3000/api/groups", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Group",
        description: "Tester",
        repoOwner: "owner",
        repoName: "repo",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: "You do not have access to this GitHub repository",
    });
  });
});
