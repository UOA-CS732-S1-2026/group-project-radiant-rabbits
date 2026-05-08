type StatsRowProps = {
  metrics: {
    totalCommits: number;
    commitsLastSprint: number;
    totalPullRequests: number;
    pullRequestsMergedLastSprint: number;
    totalIssuesClosed: number;
    issuesClosedLastSprint: number;
    activeContributors: number;
  };
};

// Component for the 4 headline stat cards (commits, PRs, issues, contributors)
export default function StatsRow({ metrics }: StatsRowProps) {
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
