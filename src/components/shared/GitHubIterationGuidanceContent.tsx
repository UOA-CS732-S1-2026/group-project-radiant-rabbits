import {
  GITHUB_ITERATION_FIELDS_DOCS_HREF,
  type GitHubIterationGuidanceVariant,
} from "@/lib/githubProjectDocs";

export type GitHubIterationGuidanceTextSize = "compact" | "relaxed" | "default";

export default function GitHubIterationGuidanceContent({
  variant,
  textSize = "default",
}: {
  variant: GitHubIterationGuidanceVariant;
  textSize?: GitHubIterationGuidanceTextSize;
}) {
  const bodyClass =
    textSize === "compact"
      ? "text-body-xs leading-relaxed text-brand-dark/80"
      : textSize === "relaxed"
        ? "text-body-sm leading-relaxed text-brand-dark/85 sm:text-body-md"
        : "text-body-md leading-relaxed text-brand-dark/90";
  const linkClass =
    textSize === "compact"
      ? "font-semibold text-brand-accent underline text-body-xs"
      : textSize === "relaxed"
        ? "font-semibold text-brand-accent underline text-body-sm sm:text-body-md"
        : "font-semibold text-brand-accent underline";

  // The two empty states need different fixes: add the field first, or add
  // iterations to an already-configured field.
  if (variant === "no-field") {
    return (
      <div className="space-y-3 text-left">
        <p className={bodyClass}>
          This repo&apos;s GitHub Project doesn&apos;t have an iteration field
          yet. Once you{" "}
          <a
            href={GITHUB_ITERATION_FIELDS_DOCS_HREF}
            target="_blank"
            rel="noreferrer"
            className={linkClass}
          >
            add an iteration field
          </a>{" "}
          to your Project (or create a Project for this repo) and assign tickets
          to it, sprint metrics will appear here on the next sync.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-left">
      <p className={bodyClass}>
        Your iteration field is set up but has no iterations yet. Create one in
        your GitHub Project, assign tickets to it, then refresh. See{" "}
        <a
          href={GITHUB_ITERATION_FIELDS_DOCS_HREF}
          target="_blank"
          rel="noreferrer"
          className={linkClass}
        >
          GitHub&apos;s guide to iteration fields
        </a>{" "}
        for setup details.
      </p>
    </div>
  );
}
