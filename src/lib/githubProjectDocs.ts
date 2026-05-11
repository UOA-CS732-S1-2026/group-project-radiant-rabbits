/** GitHub Docs: iteration fields on Projects (sprint dates & scope in SprintHub). */

export type GitHubIterationGuidanceVariant = "no-field" | "no-iterations";

export const GITHUB_ITERATION_FIELDS_DOCS_URL =
  "https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-iteration-fields";

/**
 * Use this in `href` from the UI. It resolves on our origin then redirects to
 * {@link GITHUB_ITERATION_FIELDS_DOCS_URL}.
 */
export const GITHUB_ITERATION_FIELDS_DOCS_HREF =
  "/docs/github-iteration-fields";
