// GitHub GraphQL API endpoint - all requests go through this single URL
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

// Types for the data we fetch from GitHub - these are the shapes of the objects

export interface CommitData {
  sha: string;
  message: string;
  author: { name: string; email: string; login?: string };
  date: string;
  filesChanged?: number;
}

export interface PullRequestData {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  createdAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  author: string;
}

export interface IssueData {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED";
  createdAt: string;
  closedAt: string | null;
  author: string;
}

export interface ProjectTaskData {
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  assignees: string[];
  issueNumber: number | null;
}

// Error classes to represent different failure modes when talking to GitHub API.

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export class GitHubRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubRateLimitError";
  }
}

// GraphQL helper functions that every fetch function uses to talk to GitHub.
// Handles authentication, error parsing, and rate limit detection.

async function graphqlRequest(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
) {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      // The user's GitHub OAuth token from NextAuth session
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  // Handle HTTP-level errors (not found, forbidden, etc.)
  if (!response.ok) {
    // Check if this is specifically a rate limit error
    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
    if (response.status === 403 && rateLimitRemaining === "0") {
      const resetAt = response.headers.get("x-ratelimit-reset");
      throw new GitHubRateLimitError(
        `GitHub rate limit exceeded. Resets at ${resetAt}`,
      );
    }
    throw new GitHubApiError(
      `GitHub API error: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  const json = await response.json();

  // GraphQL can return 200 OK but still have errors in the response body
  if (json.errors) {
    throw new GitHubApiError(
      `GraphQL errors: ${json.errors.map((e: { message: string }) => e.message).join(", ")}`,
      422,
    );
  }

  return json.data;
}

// Fetches commit history from the repo's default branch (usually main).
// GitHub GraphQL API paginates results, so we loop until we've fetched all commits.

const COMMITS_QUERY = `
  query($owner: String!, $repo: String!, $after: String, $since: GitTimestamp) {
    repository(owner: $owner, name: $repo) {
      defaultBranchRef {
        target {
          ... on Commit {
            history(first: 100, after: $after, since: $since) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                oid
                message
                author {
                  name
                  email
                  user {
                    login
                  }
                }
                committedDate
                changedFilesIfAvailable
              }
            }
          }
        }
      }
    }
  }
`;

export async function fetchCommits(
  token: string,
  owner: string,
  repo: string,
  since?: string,
): Promise<CommitData[]> {
  const commits: CommitData[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    // Build variables - only include `since` if doing incremental sync
    const variables: Record<string, unknown> = { owner, repo, after: cursor };
    if (since) variables.since = since;

    const data = await graphqlRequest(token, COMMITS_QUERY, variables);

    // defaultBranchRef can be null if the repo is empty
    const history = data.repository.defaultBranchRef?.target?.history;
    if (!history) break;

    // Map each GraphQL node to our CommitData shape
    for (const node of history.nodes) {
      commits.push({
        sha: node.oid, // GraphQL calls it "oid", we store it as "sha"
        message: node.message,
        author: {
          name: node.author.name || "",
          email: node.author.email || "",
          login: node.author.user?.login, // Can be null if commit author isn't a GitHub user
        },
        date: node.committedDate,
        filesChanged: node.changedFilesIfAvailable ?? undefined,
      });
    }

    hasNextPage = history.pageInfo.hasNextPage;
    cursor = history.pageInfo.endCursor;
  }

  return commits;
}

// Fetches all PRs (open, closed, merged) ordered by most recently updated.
// Supports incremental sync by stopping once we hit PRs that haven't changed since our last sync.

const PULL_REQUESTS_QUERY = `
  query($owner: String!, $repo: String!, $after: String) {
    repository(owner: $owner, name: $repo) {
      pullRequests(first: 100, after: $after, orderBy: {field: UPDATED_AT, direction: DESC}) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          number
          title
          state
          createdAt
          closedAt
          mergedAt
          updatedAt
          author {
            login
          }
        }
      }
    }
  }
`;

export async function fetchPullRequests(
  token: string,
  owner: string,
  repo: string,
  since?: string,
): Promise<PullRequestData[]> {
  const pullRequests: PullRequestData[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await graphqlRequest(token, PULL_REQUESTS_QUERY, {
      owner,
      repo,
      after: cursor,
    });
    const prs = data.repository.pullRequests;

    for (const node of prs.nodes) {
      // Early exit: since PRs are ordered by updatedAt DESC, once we see
      // one older than `since`, all remaining PRs are also older - stop here
      if (since && new Date(node.updatedAt) < new Date(since)) {
        return pullRequests;
      }

      pullRequests.push({
        number: node.number,
        title: node.title,
        state: node.state, // GitHub returns "OPEN", "CLOSED", or "MERGED"
        createdAt: node.createdAt,
        closedAt: node.closedAt,
        mergedAt: node.mergedAt,
        author: node.author?.login || "unknown", // Can be null if user deleted their account
      });
    }

    hasNextPage = prs.pageInfo.hasNextPage;
    cursor = prs.pageInfo.endCursor;
  }

  return pullRequests;
}

// Fetches all issues (open and closed). Ordered by most recently updated.
// Supports incremental sync by stopping once we hit issues that haven't changed since our last sync.

const ISSUES_QUERY = `
  query($owner: String!, $repo: String!, $after: String, $since: DateTime) {
    repository(owner: $owner, name: $repo) {
      issues(first: 100, after: $after, orderBy: {field: UPDATED_AT, direction: DESC}, filterBy: {since: $since}) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          number
          title
          state
          createdAt
          closedAt
          author {
            login
          }
        }
      }
    }
  }
`;

export async function fetchIssues(
  token: string,
  owner: string,
  repo: string,
  since?: string,
): Promise<IssueData[]> {
  const issues: IssueData[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    // Only pass `since` if doing incremental sync - GitHub filters server-side
    const variables: Record<string, unknown> = { owner, repo, after: cursor };
    if (since) variables.since = since;

    const data = await graphqlRequest(token, ISSUES_QUERY, variables);
    const issueConnection = data.repository.issues;

    for (const node of issueConnection.nodes) {
      issues.push({
        number: node.number,
        title: node.title,
        state: node.state, // "OPEN" or "CLOSED"
        createdAt: node.createdAt,
        closedAt: node.closedAt,
        author: node.author?.login || "unknown",
      });
    }

    hasNextPage = issueConnection.pageInfo.hasNextPage;
    cursor = issueConnection.pageInfo.endCursor;
  }

  return issues;
}

// Fetches items from GitHub Projects v2 (the project board)
// Items can be in columns : "Todo", "In Progress", "Done"
// A repo can have multiple projects, and each project has items.
// Items can be Issues, PRs, or DraftIssues (notes without a linked issue).
// We paginate through both projects and items within each project.

const PROJECT_TASKS_QUERY = `
  query($owner: String!, $repo: String!, $projectCursor: String, $itemCursor: String) {
    repository(owner: $owner, name: $repo) {
      projectsV2(first: 5, after: $projectCursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          title
          items(first: 100, after: $itemCursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              fieldValueByName(name: "Status") {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                }
              }
              content {
                ... on Issue {
                  number
                  title
                  assignees(first: 10) {
                    nodes {
                      login
                    }
                  }
                }
                ... on DraftIssue {
                  title
                }
                ... on PullRequest {
                  number
                  title
                  assignees(first: 10) {
                    nodes {
                      login
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// Maps common GitHub Project column names to our status enum.
// GitHub lets users name columns anything, so we normalise common
// variations (e.g. "In Progress", "in_progress", "In Review" → IN_PROGRESS).
function mapStatus(statusName: string): "TODO" | "IN_PROGRESS" | "DONE" {
  const normalized = statusName.toLowerCase().replace(/[\s_-]/g, "");
  if (["todo", "backlog", "new", "toplan"].includes(normalized)) return "TODO";
  if (["inprogress", "inreview", "active", "doing"].includes(normalized))
    return "IN_PROGRESS";
  if (
    ["done", "closed", "complete", "completed", "merged"].includes(normalized)
  )
    return "DONE";
  // Default to TODO for any unrecognised column name
  return "TODO";
}

export async function fetchProjectTasks(
  token: string,
  owner: string,
  repo: string,
): Promise<ProjectTaskData[]> {
  const tasks: ProjectTaskData[] = [];

  // Outer loop: paginate through projects (most repos have 1-2)
  let projectCursor: string | null = null;
  let hasMoreProjects = true;

  while (hasMoreProjects) {
    const data = await graphqlRequest(token, PROJECT_TASKS_QUERY, {
      owner,
      repo,
      projectCursor,
      itemCursor: null,
    });

    const projectsConnection = data.repository.projectsV2;
    if (!projectsConnection) break;

    // Loop through each project found on the repo
    for (const project of projectsConnection.nodes) {
      // Inner loop: paginate through items within this project
      let itemCursor: string | null = null;
      let hasMoreItems = true;
      let isFirstPage = true;

      while (hasMoreItems) {
        let items: {
          nodes: Array<{
            content: {
              title?: string;
              number?: number;
              assignees?: { nodes: Array<{ login: string }> };
            } | null;
            fieldValueByName: { name: string } | null;
          }>;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };

        if (isFirstPage) {
          // The first page of items was already included in the project query
          items = project.items;
          isFirstPage = false;
        } else {
          // Fetch subsequent pages of items with a new request
          const pageData = await graphqlRequest(token, PROJECT_TASKS_QUERY, {
            owner,
            repo,
            projectCursor: null,
            itemCursor,
          });
          // Find the same project in the new response
          const matchingProject = pageData.repository.projectsV2?.nodes?.find(
            (p: { title: string }) => p.title === project.title,
          );
          if (!matchingProject) break;
          items = matchingProject.items;
        }

        for (const item of items.nodes) {
          // `content` is null for items that have been removed/archived
          const content = item.content;
          if (!content) continue;

          // Read the "Status" column value - defaults to "Todo" if not set
          const statusField = item.fieldValueByName;
          const statusName = statusField?.name || "Todo";

          tasks.push({
            title: content.title || "Untitled",
            status: mapStatus(statusName),
            // Collect GitHub usernames of anyone assigned to this item
            assignees:
              content.assignees?.nodes?.map(
                (a: { login: string }) => a.login,
              ) || [],
            // Issues and PRs have a number; DraftIssues don't
            issueNumber: content.number || null,
          });
        }

        hasMoreItems = items.pageInfo.hasNextPage;
        itemCursor = items.pageInfo.endCursor;
      }
    }

    hasMoreProjects = projectsConnection.pageInfo.hasNextPage;
    projectCursor = projectsConnection.pageInfo.endCursor;
  }

  return tasks;
}
