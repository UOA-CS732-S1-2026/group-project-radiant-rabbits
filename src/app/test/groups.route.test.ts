import { getServerSession } from "next-auth/next";
import { Group } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
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
  },
}));

// Define types for the mocked functions
type SessionLike = {
  user?: {
    id?: string;
    name?: string;
  };
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
    });

    mockConnectMongoDB.mockResolvedValue(undefined);

    mockGroupCreate.mockResolvedValue({
      name: "Test Group",
      description: "This is a test group",
      inviteCode: "ABCDEFG1",
      members: ["123"],
      createdBy: "123",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new Request("http://localhost:3000/api/groups", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Group",
        description: "This is a test group",
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
  });
});
