import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  Commit,
  Group,
  Issue,
  PullRequest,
  Sprint,
  SprintTask,
  User,
} from "@/app/lib/models";
import {
  aggregateSprintReviewData,
  type SprintReviewAggregate,
} from "@/app/lib/sprintReviewService";
import { normalizeUserRef } from "@/app/lib/userRef";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "test-sprint-review-aggregate",
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Promise.all([
    Commit.deleteMany({}),
    Issue.deleteMany({}),
    PullRequest.deleteMany({}),
    Sprint.deleteMany({}),
    SprintTask.deleteMany({}),
    Group.deleteMany({}),
    User.deleteMany({}),
  ]);
});

describe("aggregateSprintReviewData", () => {
  async function createGroupAndSprint() {
    const user1Id = normalizeUserRef("user1");
    const user2Id = normalizeUserRef("user2");

    if (!user1Id || !user2Id) {
      throw new Error("Failed to normalise user ids");
    }

    const group = await Group.create({
      name: "Radiant Rabbits",
      description: "SprintHub team project",
      inviteCode: "REVWAGG1",
      members: ["user1", "user2"],
      createdBy: "user1",
      repoOwner: "UOA-CS732-S1-2026",
      repoName: "group-project-radiant-rabbits",
    });

    await User.create({
      _id: user1Id,
      githubId: "user1",
      login: "alice",
      name: "Alice",
      email: "alice@example.com",
    });

    await User.create({
      _id: user2Id,
      githubId: "user2",
      login: "bob",
      name: "Bob",
      email: "bob@example.com",
    });

    const sprint = await Sprint.create({
      group: group._id,
      name: "Sprint 4",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-04-14T23:59:59.000Z"),
      status: "ACTIVE",
      isCurrent: true,
      goal: "Implement review generation",
    });

    return { group, sprint };
  }

  it("aggregates metrics, members, and contributor counts for a sprint range", async () => {
    const { group, sprint } = await createGroupAndSprint();

    await Commit.insertMany([
      {
        group: group._id,
        sha: "c1",
        message: "Add endpoint",
        author: { name: "Alice", email: "alice@example.com" },
        date: new Date("2026-04-03T10:00:00.000Z"),
      },
      {
        group: group._id,
        sha: "c2",
        message: "Improve prompt",
        author: { name: "Alice", email: "alice@example.com" },
        date: new Date("2026-04-04T10:00:00.000Z"),
      },
      {
        group: group._id,
        sha: "c3",
        message: "Fix tests",
        author: { name: "Bob", email: "bob@example.com" },
        date: new Date("2026-04-05T10:00:00.000Z"),
      },
      {
        group: group._id,
        sha: "c-old",
        message: "Outside sprint",
        author: { name: "Alice", email: "alice@example.com" },
        date: new Date("2026-03-20T10:00:00.000Z"),
      },
    ]);

    await Issue.insertMany([
      {
        group: group._id,
        number: 101,
        title: "Implement API route",
        state: "OPEN",
        createdAt: new Date("2026-04-02T08:00:00.000Z"),
        author: "Alice",
      },
      {
        group: group._id,
        number: 102,
        title: "Improve loading state",
        state: "CLOSED",
        createdAt: new Date("2026-04-03T08:00:00.000Z"),
        closedAt: new Date("2026-04-06T08:00:00.000Z"),
        author: "Bob",
      },
      {
        group: group._id,
        number: 103,
        title: "Old issue",
        state: "CLOSED",
        createdAt: new Date("2026-03-20T08:00:00.000Z"),
        closedAt: new Date("2026-03-25T08:00:00.000Z"),
        author: "Alice",
      },
    ]);

    await PullRequest.insertMany([
      {
        group: group._id,
        number: 33,
        title: "Review service",
        state: "MERGED",
        createdAt: new Date("2026-04-05T12:00:00.000Z"),
        mergedAt: new Date("2026-04-06T12:00:00.000Z"),
        author: "Alice",
      },
      {
        group: group._id,
        number: 34,
        title: "UI update",
        state: "OPEN",
        createdAt: new Date("2026-04-07T12:00:00.000Z"),
        author: "Bob",
      },
      {
        group: group._id,
        number: 21,
        title: "Outside sprint PR",
        state: "MERGED",
        createdAt: new Date("2026-03-10T12:00:00.000Z"),
        mergedAt: new Date("2026-03-11T12:00:00.000Z"),
        author: "Alice",
      },
    ]);

    await SprintTask.insertMany([
      {
        group: group._id,
        sprint: sprint._id,
        title: "Wire review summary to sprint data",
        status: "DONE",
        issueNumber: 201,
        assignees: ["Alice"],
      },
      {
        group: group._id,
        sprint: sprint._id,
        title: "Polish review UI",
        status: "IN_PROGRESS",
        issueNumber: 202,
        assignees: ["Bob"],
      },
      {
        group: group._id,
        title: "Backlog task outside sprint",
        status: "TODO",
        issueNumber: 203,
        assignees: ["Alice"],
      },
    ]);

    const result = await aggregateSprintReviewData(
      group._id.toString(),
      sprint._id.toString(),
    );

    expect(result.group.name).toBe("Radiant Rabbits");
    expect(result.sprint.name).toBe("Sprint 4");
    expect(result.members).toHaveLength(2);
    expect(result.members.map((member) => member.name)).toEqual(
      expect.arrayContaining(["Alice", "Bob"]),
    );

    expect(result.metrics).toEqual({
      commitCount: 3,
      issuesOpened: 2,
      issuesClosed: 1,
      pullRequestsOpened: 2,
      pullRequestsMerged: 1,
      tasksTotal: 2,
      tasksTodo: 0,
      tasksInProgress: 1,
      tasksDone: 1,
    });

    expect(result.topContributors[0].name).toBe("Alice");
    expect(result.topContributors[0].commits).toBe(2);
    expect(result.topContributors[0].pullRequestsMerged).toBe(1);

    expect(result.highlights.recentCommits).toHaveLength(3);
    expect(result.highlights.recentIssuesOpened).toHaveLength(2);
    expect(result.highlights.recentIssuesClosed).toHaveLength(1);
    expect(result.highlights.recentPullRequestsOpened).toHaveLength(2);
    expect(result.highlights.recentPullRequestsMerged).toHaveLength(1);
    expect(result.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Wire review summary to sprint data",
          status: "DONE",
          issueNumber: 201,
          assignees: ["Alice"],
        }),
        expect.objectContaining({
          title: "Polish review UI",
          status: "IN_PROGRESS",
          issueNumber: 202,
          assignees: ["Bob"],
        }),
      ]),
    );
  });

  it("returns empty metrics gracefully when there is no sprint activity", async () => {
    const { group, sprint } = await createGroupAndSprint();

    const result: SprintReviewAggregate = await aggregateSprintReviewData(
      group._id.toString(),
      sprint._id.toString(),
    );

    expect(result.metrics).toEqual({
      commitCount: 0,
      issuesOpened: 0,
      issuesClosed: 0,
      pullRequestsOpened: 0,
      pullRequestsMerged: 0,
      tasksTotal: 0,
      tasksTodo: 0,
      tasksInProgress: 0,
      tasksDone: 0,
    });
    expect(result.tasks).toEqual([]);
    expect(result.topContributors).toEqual([]);
    expect(result.highlights.recentCommits).toEqual([]);
  });
});
