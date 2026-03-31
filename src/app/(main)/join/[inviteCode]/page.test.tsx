import { render, screen } from "@testing-library/react";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Group } from "@/app/lib/models";
import JoinInvitePage from "./page";

jest.mock("next-auth/next");
jest.mock("next/navigation");

const mockGetServerSession = getServerSession as jest.Mock;
const mockRedirect = redirect as unknown as jest.Mock;

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Group.deleteMany({});
  jest.clearAllMocks();
});

describe("JoinGroupPage - Logic & UI Integration", () => {
  // Test 1: Redirects user to login if not authenticated/logged in
  it("Test 1 - Logic: Unauthenticated User | Redirect to Log in", async () => {
    // Set unauthenticated server session
    mockGetServerSession.mockResolvedValue(null);

    const inviteCode = "TEST123";
    const params = Promise.resolve({ inviteCode });

    try {
      await JoinInvitePage({ params });
    } catch (e) {
      // Catch to ensure the test doesn't fail
    }

    // Redirect and logic assertion
    expect(mockRedirect).toHaveBeenCalledWith(
      `/?callbackUrl=/join/${inviteCode}`,
    );
    expect(Group.findOne).not.toHaveBeenCalled();
  });

  // Test 2: Redirects user to groups page if the invite code is invalid
  it("Test 2 - Logic: Invalid Invite Code | UI: Show Invalid Invite Error", async () => {
    // Set up mock authentication
    mockGetServerSession.mockResolvedValue({ user: { name: "Tester" } });

    // Call function to render page
    const params = Promise.resolve({ inviteCode: "TEST123" });
    const Page = await JoinInvitePage({ params });
    render(Page);

    // Logic assertion - group is not found since invite code is invalid
    const updatedGroup = await Group.findOne({ inviteCode: "TEST123" });
    expect(updatedGroup).toBeFalsy();

    // UI assertion - should display error message and button to redirect to groups page
    expect(
      screen.getByText(/The code TEST123 is invalid./i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Back to Groups/i }),
    ).toBeInTheDocument();
  });

  // Test 3: Redirects user to group dashboard if the user is already a member of the group
  it("Test 3 - Logic: User is already in the group | UI: Show already in the group Error", async () => {
    // Set up mock authentication
    mockGetServerSession.mockResolvedValue({ user: { name: "Tester" } });

    // Set up database
    await Group.create({
      name: "Testing Team",
      inviteCode: "TEST123",
      members: ["Tester"],
    });

    // Call function to render page
    const params = Promise.resolve({ inviteCode: "TEST123" });
    const Page = await JoinInvitePage({ params });
    render(Page);

    // Logic assertion - user is already a member of the group
    const updatedGroup = await Group.findOne({ inviteCode: "TEST123" });
    expect(updatedGroup?.members).toContain("Tester");

    // UI assertion - should display error message and button to redirect to dashboard
    expect(
      screen.getByText(/You are already a member of the Testing Team group./i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Go to Group Dashboard/i }),
    ).toBeInTheDocument();
  });

  // Test 4: Otherwise, user is successful in joining a group using the invite link
  it("Test 4 - Logic: User is successful in joining the group | UI: Show successful message", async () => {
    // Set up mock authentication
    mockGetServerSession.mockResolvedValue({ user: { name: "Tester" } });

    // Set up database
    await Group.create({
      name: "Testing Team",
      inviteCode: "TEST123",
      members: [],
    });

    // Call function to render page
    const params = Promise.resolve({ inviteCode: "TEST123" });
    const Page = await JoinInvitePage({ params });
    render(Page);

    // Logic assertion - user should now be a member of the group
    const updatedGroup = await Group.findOne({ inviteCode: "TEST123" });
    expect(updatedGroup?.members).toContain("Tester");

    // UI assertion - should display success message and button to redirect to dashboard
    expect(
      screen.getByText(/Successfully joined Testing Team!/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Go to Group Dashboard/i }),
    ).toBeInTheDocument();
  });

  // Test 5: Database connection error
  it("Test 5 - Logic: Connection to database fails | UI: Show connection error message", async () => {
    // Set up mock authentication
    mockGetServerSession.mockResolvedValue({ user: { name: "Tester" } });

    // Simulate database connection error
    const spy = jest
      .spyOn(Group, "findOne")
      .mockRejectedValue(new Error("DB Connection Failed"));

    // Call function to render page
    const params = Promise.resolve({ inviteCode: "TEST123" });
    const Page = await JoinInvitePage({ params });
    render(Page);

    // UI assertion - error message should display
    expect(
      screen.getByText(
        /We have encountered an error connecting to the database./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Back to Groups/i }),
    ).toBeInTheDocument();

    spy.mockRestore();
  });
});
