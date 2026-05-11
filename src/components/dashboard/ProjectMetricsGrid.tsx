import GitHubIterationGuidanceCallout from "@/components/shared/GitHubIterationGuidanceCallout";
import GitHubIterationGuidanceContent from "@/components/shared/GitHubIterationGuidanceContent";
import type { GitHubIterationGuidanceVariant } from "@/lib/githubProjectDocs";

type ProjectMetricsGridProps = {
  metrics: {
    totalCommits: number;
    commitsLastSprint: number;
    totalPullRequests: number;
    pullRequestsMergedLastSprint: number;
    totalIssuesClosed: number;
    issuesClosedLastSprint: number;
    activeContributors: number;
  };
  /** Same shell as other metric tiles; full width above the four metric tiles when set. */
  sprintVelocityGuidance?: {
    variant: GitHubIterationGuidanceVariant;
  };
};

/**
 * Optional sprint-velocity / GitHub iteration guidance (full-width row when no
 * chart data), then headline project metrics (commits, PRs, issues, contributors).
 */
export default function ProjectMetricsGrid({
  metrics,
  sprintVelocityGuidance,
}: ProjectMetricsGridProps) {
  const stats = [
    {
      value: String(metrics.totalCommits),
      label: "Commits",
      detail: `+ ${metrics.commitsLastSprint} last sprint`,
    },
    {
      value: String(metrics.totalPullRequests),
      label: "Pull Requests",
      detail: `+ ${metrics.pullRequestsMergedLastSprint} merged last sprint`,
    },
    {
      value: String(metrics.totalIssuesClosed),
      label: "Issues Closed",
      detail: `+ ${metrics.issuesClosedLastSprint} closed last sprint`,
    },
    {
      value: String(metrics.activeContributors),
      label: "Active Contributors",
      detail: "",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-md md:grid-cols-4">
      {sprintVelocityGuidance ? (
        <div className="col-span-2 md:col-span-4">
          <GitHubIterationGuidanceCallout title="Sprint velocity needs GitHub iterations">
            <GitHubIterationGuidanceContent
              variant={sprintVelocityGuidance.variant}
              textSize="relaxed"
            />
          </GitHubIterationGuidanceCallout>
        </div>
      ) : null}
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-brand-dark/10 bg-brand-surface p-md"
        >
          <p className="text-h3 font-bold leading-none text-brand-dark">
            {stat.value}
          </p>
          <p className="mt-xs text-body-sm font-medium text-brand-dark">
            {stat.label}
          </p>
          <p className="mt-sm text-body-xs text-brand-dark/60">{stat.detail}</p>
        </div>
      ))}
    </div>
  );
}
