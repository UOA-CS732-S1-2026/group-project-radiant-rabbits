export type GitHubIterationGuidanceVariant = "no-field" | "no-iterations";

export const GITHUB_ITERATION_FIELDS_DOCS_URL =
  "https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-iteration-fields";

/**
 * Link through an app route instead of the external URL directly so tests and
 * UI copy have one stable target even if GitHub moves the docs page later.
 */
export const GITHUB_ITERATION_FIELDS_DOCS_HREF =
  "/docs/github-iteration-fields";
