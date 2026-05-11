import {
  buildSprintReviewPrompt,
  type SprintReviewAggregate,
} from "@/app/lib/sprintReviewService";

describe("buildSprintReviewPrompt", () => {
  function makeSampleAggregate(): SprintReviewAggregate {
    return {
      sprint: {
        id: "sprint-1",
        name: "Sprint 8",
        status: "ACTIVE",
        goal: "Complete sprint review automation",
        isCurrent: true,
        startDate: "2026-04-01T00:00:00.000Z",
        endDate: "2026-04-14T00:00:00.000Z",
      },
      group: {
        id: "group-1",
        name: "radiant-rabbits",
        description: "Team project",
        repoOwner: "UOA-CS732-S1-2026",
        repoName: "group-project-radiant-rabbits",
      },
      members: [
        { id: "u1", name: "Alice", email: "alice@example.com" },
        { id: "u2", name: "Bob", email: "bob@example.com" },
      ],
      metrics: {
        commitCount: 12,
        issuesOpened: 7,
        issuesClosed: 5,
        pullRequestsOpened: 4,
        pullRequestsMerged: 3,
        tasksTotal: 3,
        tasksTodo: 1,
        tasksInProgress: 1,
        tasksDone: 1,
      },
      tasks: [
        {
          id: "task-1",
          title: "Implement sprint review endpoint",
          status: "DONE",
          issueNumber: 101,
          assignees: ["Alice"],
        },
      ],
      topContributors: [
        {
          name: "Alice",
          commits: 8,
          issuesOpened: 3,
          issuesClosed: 2,
          pullRequestsOpened: 2,
          pullRequestsMerged: 2,
          tasksAssigned: 1,
          tasksDone: 1,
          total: 17,
        },
      ],
      highlights: {
        recentCommits: [
          {
            sha: "abc123",
            message: "Implement sprint review endpoint",
            author: "Alice",
            date: "2026-04-10T00:00:00.000Z",
          },
        ],
        recentIssuesOpened: [
          {
            number: 101,
            title: "Add regenerate button",
            author: "Bob",
            createdAt: "2026-04-11T00:00:00.000Z",
          },
        ],
        recentIssuesClosed: [
          {
            number: 88,
            title: "Fix auth check",
            author: "Alice",
            closedAt: "2026-04-12T00:00:00.000Z",
          },
        ],
        recentPullRequestsOpened: [
          {
            number: 44,
            title: "Review service implementation",
            author: "Alice",
            createdAt: "2026-04-09T00:00:00.000Z",
          },
        ],
        recentPullRequestsMerged: [
          {
            number: 40,
            title: "Sprint data aggregation",
            author: "Bob",
            mergedAt: "2026-04-10T00:00:00.000Z",
          },
        ],
      },
    };
  }

  it("includes required output sections and writing rules", () => {
    const prompt = buildSprintReviewPrompt(makeSampleAggregate());

    expect(prompt).toContain("Sprint Overview");
    expect(prompt).toContain("Key Contributions");
    expect(prompt).toContain("Team Activity");
    expect(prompt).toContain("Observations / Insights");
    expect(prompt).toContain("Keep the tone neutral and objective");
    expect(prompt).toContain(
      "If data is missing, explicitly say data is unavailable",
    );
  });

  it("embeds structured sprint JSON data", () => {
    const prompt = buildSprintReviewPrompt(makeSampleAggregate());

    expect(prompt).toContain('"name": "Sprint 8"');
    expect(prompt).toContain('"commitCount": 12');
    expect(prompt).toContain('"tasksTotal": 3');
    expect(prompt).toContain('"Implement sprint review endpoint"');
    expect(prompt).toContain('"topContributors"');
    expect(prompt).toContain('"recentPullRequestsMerged"');
  });
});
