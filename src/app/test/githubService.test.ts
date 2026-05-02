import {
  fetchCommits,
  fetchIssues,
  fetchProjectTasks,
  fetchPullRequests,
  GitHubApiError,
  GitHubRateLimitError,
} from "@/app/lib/githubService";

// Mock global fetch
// Each test sets up its own mock response

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helper: creates a fake successful GitHub GraphQL response
function mockGraphQLResponse(data: unknown) {
  return {
    ok: true,
    headers: new Headers(),
    json: async () => ({ data }),
  };
}

// Helper: creates a fake error response
function mockErrorResponse(status: number, statusText: string, headers = {}) {
  return {
    ok: false,
    status,
    statusText,
    headers: new Headers(headers),
    json: async () => ({}),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// fetchCommits tests

describe("fetchCommits", () => {
  it("should fetch commits from the default branch", async () => {
    // Simulate a single page of 2 commits
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        repository: {
          defaultBranchRef: {
            target: {
              history: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [
                  {
                    oid: "abc123",
                    message: "Initial commit",
                    author: {
                      name: "Alice",
                      email: "alice@example.com",
                      user: { login: "alice" },
                    },
                    committedDate: "2026-01-01T00:00:00Z",
                    changedFilesIfAvailable: 3,
                  },
                  {
                    oid: "def456",
                    message: "Add feature",
                    author: {
                      name: "Bob",
                      email: "bob@example.com",
                      user: null, // Not a GitHub user
                    },
                    committedDate: "2026-01-02T00:00:00Z",
                    changedFilesIfAvailable: null,
                  },
                ],
              },
            },
          },
        },
      }),
    );

    const commits = await fetchCommits("fake-token", "owner", "repo");

    expect(commits).toHaveLength(2);
    expect(commits[0]).toEqual({
      sha: "abc123",
      message: "Initial commit",
      author: { name: "Alice", email: "alice@example.com", login: "alice" },
      date: "2026-01-01T00:00:00Z",
      filesChanged: 3,
    });
    // Bob has no GitHub login - login should be undefined
    expect(commits[1].author.login).toBeUndefined();
    expect(commits[1].filesChanged).toBeUndefined();
  });

  it("should handle pagination across multiple pages", async () => {
    // Page 1: has more pages
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        repository: {
          defaultBranchRef: {
            target: {
              history: {
                pageInfo: { hasNextPage: true, endCursor: "cursor1" },
                nodes: [
                  {
                    oid: "aaa",
                    message: "First",
                    author: { name: "A", email: "a@test.com", user: null },
                    committedDate: "2026-01-01T00:00:00Z",
                    changedFilesIfAvailable: null,
                  },
                ],
              },
            },
          },
        },
      }),
    );

    // Page 2: last page
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        repository: {
          defaultBranchRef: {
            target: {
              history: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [
                  {
                    oid: "bbb",
                    message: "Second",
                    author: { name: "B", email: "b@test.com", user: null },
                    committedDate: "2026-01-02T00:00:00Z",
                    changedFilesIfAvailable: null,
                  },
                ],
              },
            },
          },
        },
      }),
    );

    const commits = await fetchCommits("fake-token", "owner", "repo");

    // Should have fetched both pages
    expect(commits).toHaveLength(2);
    expect(commits[0].sha).toBe("aaa");
    expect(commits[1].sha).toBe("bbb");
    // fetch should have been called twice (once per page)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should pass since parameter for incremental sync", async () => {
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        repository: {
          defaultBranchRef: {
            target: {
              history: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [],
              },
            },
          },
        },
      }),
    );

    await fetchCommits("fake-token", "owner", "repo", "2026-03-01T00:00:00Z");

    // Check that the `since` variable was included in the request body
    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody.variables.since).toBe("2026-03-01T00:00:00Z");
  });

  it("should return empty array for empty repos (no defaultBranchRef)", async () => {
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        repository: {
          defaultBranchRef: null,
        },
      }),
    );

    const commits = await fetchCommits("fake-token", "owner", "empty-repo");
    expect(commits).toEqual([]);
  });
});

// fetchPullRequests tests

describe("fetchPullRequests", () => {
  it("should fetch all PR states (open, closed, merged)", async () => {
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        repository: {
          pullRequests: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                number: 1,
                title: "Add feature",
                state: "MERGED",
                createdAt: "2026-01-01T00:00:00Z",
                closedAt: "2026-01-02T00:00:00Z",
                mergedAt: "2026-01-02T00:00:00Z",
                updatedAt: "2026-01-02T00:00:00Z",
                author: { login: "alice" },
              },
              {
                number: 2,
                title: "WIP",
                state: "OPEN",
                createdAt: "2026-01-03T00:00:00Z",
                closedAt: null,
                mergedAt: null,
                updatedAt: "2026-01-03T00:00:00Z",
                author: { login: "bob" },
              },
            ],
          },
        },
      }),
    );

    const prs = await fetchPullRequests("fake-token", "owner", "repo");

    expect(prs).toHaveLength(2);
    expect(prs[0].state).toBe("MERGED");
    expect(prs[0].mergedAt).toBe("2026-01-02T00:00:00Z");
    expect(prs[1].state).toBe("OPEN");
    expect(prs[1].closedAt).toBeNull();
  });

  it("should stop fetching when PRs are older than since date", async () => {
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        repository: {
          pullRequests: {
            pageInfo: { hasNextPage: true, endCursor: "cursor1" },
            nodes: [
              {
                number: 10,
                title: "Recent PR",
                state: "OPEN",
                createdAt: "2026-03-15T00:00:00Z",
                closedAt: null,
                mergedAt: null,
                updatedAt: "2026-03-15T00:00:00Z",
                author: { login: "alice" },
              },
              {
                // This PR was updated before our since date - stop here
                number: 5,
                title: "Old PR",
                state: "CLOSED",
                createdAt: "2026-01-01T00:00:00Z",
                closedAt: "2026-01-02T00:00:00Z",
                mergedAt: null,
                updatedAt: "2026-01-02T00:00:00Z",
                author: { login: "bob" },
              },
            ],
          },
        },
      }),
    );

    const prs = await fetchPullRequests(
      "fake-token",
      "owner",
      "repo",
      "2026-03-01T00:00:00Z",
    );

    // Should only include the recent PR, not the old one
    expect(prs).toHaveLength(1);
    expect(prs[0].number).toBe(10);
    // Should NOT have fetched page 2 since we hit the since boundary
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should handle PRs with deleted authors", async () => {
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        repository: {
          pullRequests: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                number: 1,
                title: "Orphan PR",
                state: "CLOSED",
                createdAt: "2026-01-01T00:00:00Z",
                closedAt: "2026-01-02T00:00:00Z",
                mergedAt: null,
                updatedAt: "2026-01-02T00:00:00Z",
                author: null, // Author deleted their GitHub account
              },
            ],
          },
        },
      }),
    );

    const prs = await fetchPullRequests("fake-token", "owner", "repo");
    expect(prs[0].author).toBe("unknown");
  });
});

// fetchIssues tests

describe("fetchIssues", () => {
  it("should fetch open and closed issues", async () => {
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        repository: {
          issues: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                number: 1,
                title: "Bug report",
                state: "OPEN",
                createdAt: "2026-01-01T00:00:00Z",
                closedAt: null,
                author: { login: "alice" },
              },
              {
                number: 2,
                title: "Fixed bug",
                state: "CLOSED",
                createdAt: "2026-01-01T00:00:00Z",
                closedAt: "2026-01-05T00:00:00Z",
                author: { login: "bob" },
              },
            ],
          },
        },
      }),
    );

    const issues = await fetchIssues("fake-token", "owner", "repo");

    expect(issues).toHaveLength(2);
    expect(issues[0].state).toBe("OPEN");
    expect(issues[0].closedAt).toBeNull();
    expect(issues[1].state).toBe("CLOSED");
    expect(issues[1].closedAt).toBe("2026-01-05T00:00:00Z");
  });

  it("should pass since parameter for incremental sync", async () => {
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        repository: {
          issues: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [],
          },
        },
      }),
    );

    await fetchIssues("fake-token", "owner", "repo", "2026-03-01T00:00:00Z");

    // The since variable should be sent in the GraphQL request
    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody.variables.since).toBe("2026-03-01T00:00:00Z");
  });
});

// fetchProjectTasks tests

describe("fetchProjectTasks", () => {
  it("should fetch tasks and map statuses correctly", async () => {
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        repository: {
          projectsV2: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                title: "Sprint Board",
                items: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [
                    {
                      status: { name: "Todo" },
                      iteration: null,
                      content: {
                        number: 1,
                        title: "Setup project",
                        assignees: { nodes: [{ login: "alice" }] },
                      },
                    },
                    {
                      status: { name: "In Progress" },
                      iteration: null,
                      content: {
                        number: 2,
                        title: "Build API",
                        assignees: {
                          nodes: [{ login: "bob" }, { login: "carol" }],
                        },
                      },
                    },
                    {
                      status: { name: "Done" },
                      iteration: { iterationId: "iter_3" },
                      content: {
                        number: 3,
                        title: "Write docs",
                        assignees: { nodes: [] },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      }),
    );

    const tasks = await fetchProjectTasks("fake-token", "owner", "repo");

    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toEqual({
      title: "Setup project",
      status: "TODO",
      assignees: ["alice"],
      issueNumber: 1,
      iterationId: null,
    });
    expect(tasks[1].status).toBe("IN_PROGRESS");
    expect(tasks[1].assignees).toEqual(["bob", "carol"]);
    expect(tasks[1].iterationId).toBeNull();
    expect(tasks[2].status).toBe("DONE");
    expect(tasks[2].iterationId).toBe("iter_3");
  });

  it("should handle draft issues (no issue number)", async () => {
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        repository: {
          projectsV2: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                title: "Board",
                items: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [
                    {
                      status: { name: "Backlog" },
                      iteration: null,
                      content: {
                        title: "Just a note",
                        // DraftIssues have no number or assignees
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      }),
    );

    const tasks = await fetchProjectTasks("fake-token", "owner", "repo");

    expect(tasks).toHaveLength(1);
    expect(tasks[0].issueNumber).toBeNull();
    expect(tasks[0].status).toBe("TODO"); // "Backlog" maps to TODO
    expect(tasks[0].assignees).toEqual([]);
  });

  it("should skip items with null content (archived items)", async () => {
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        repository: {
          projectsV2: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                title: "Board",
                items: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [
                    {
                      status: { name: "Done" },
                      iteration: null,
                      content: null, // Archived/removed item
                    },
                  ],
                },
              },
            ],
          },
        },
      }),
    );

    const tasks = await fetchProjectTasks("fake-token", "owner", "repo");
    expect(tasks).toEqual([]);
  });

  it("should return empty array when repo has no projects", async () => {
    mockFetch.mockResolvedValueOnce(
      mockGraphQLResponse({
        repository: {
          projectsV2: null,
        },
      }),
    );

    const tasks = await fetchProjectTasks("fake-token", "owner", "repo");
    expect(tasks).toEqual([]);
  });
});

// Error handling tests

describe("Error handling", () => {
  it("should throw GitHubRateLimitError on 403 with zero remaining", async () => {
    mockFetch.mockResolvedValueOnce(
      mockErrorResponse(403, "Forbidden", {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1700000000",
      }),
    );

    await expect(fetchCommits("fake-token", "owner", "repo")).rejects.toThrow(
      GitHubRateLimitError,
    );
  });

  it("should throw GitHubApiError on 404 (repo not found)", async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse(404, "Not Found"));

    await expect(
      fetchCommits("fake-token", "owner", "nonexistent"),
    ).rejects.toThrow(GitHubApiError);
  });

  it("should throw GitHubApiError on GraphQL-level errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      json: async () => ({
        errors: [{ message: "Could not resolve to a Repository" }],
      }),
    });

    await expect(fetchCommits("fake-token", "owner", "repo")).rejects.toThrow(
      GitHubApiError,
    );
  });
});
