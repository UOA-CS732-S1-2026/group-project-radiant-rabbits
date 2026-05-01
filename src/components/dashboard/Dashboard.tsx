import ProjectTimeline from "@/components/dashboard/ProjectTimeline";

// Fetch all data required to display the dashboard metrics and pass it to the Dashboard component for rendering
type RepositoryInfo = {
  owner?: string | null;
  name?: string | null;
  isConnected: boolean;
  syncStatus?: string | null;
  syncError?: string | null;
  validationError?: string | null;
};

type SprintForDashboard = {
  name: string;
  velocity: number;
  isCurrent: boolean;
};

type DashboardProps = {
  status: "ready" | "loading" | "empty" | "error";
  statusMessage?: string;
  repository?: RepositoryInfo;
  metrics?: {
    totalCommits: number;
    commitsLastSprint: number;
    totalPullRequests: number;
    pullRequestsMergedLastSprint: number;
    totalIssuesClosed: number;
    issuesClosedLastSprint: number;
    activeContributors: number;
  };
  sprints?: SprintForDashboard[];
};

// Reusable status/error block so every failure surfaces in the dashboard UI
function StatusBlock({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-brand-surface p-lg shadow-md">
      <h2 className="text-h3 font-bold text-brand-dark">Project Overview</h2>
      <p className="mt-sm text-body-sm text-brand-dark/70">{message}</p>
    </div>
  );
}

// Page component that shows when the dashboard is loading or if it has an error
export default function Dashboard({
  status,
  statusMessage,
  repository: _repository,
  metrics,
  sprints,
}: DashboardProps) {
  if (status !== "ready") {
    return (
      <StatusBlock
        message={
          statusMessage ??
          (status === "loading"
            ? "Loading dashboard metrics..."
            : "Dashboard metrics are not available right now.")
        }
      />
    );
  }

  if (!metrics) {
    return (
      <StatusBlock message="Cannot render dashboard: metrics data is missing." />
    );
  }

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

  // Sprint progress is derived directly from the synced GitHub iterations.
  // Fall back to sprint 1 of N when no sprint is currently active (between iterations).
  const totalSprints = sprints?.length ?? 0;
  const currentSprintIndex = sprints?.findIndex((s) => s.isCurrent) ?? -1;
  const currentSprint = currentSprintIndex >= 0 ? currentSprintIndex + 1 : 1;

  // Display the dashboard with the fetched metrics and timeline chart
  return (
    <div className="ml-lg mr-lg mt-md flex flex-col lg:gap-lg gap-md">
      {/* Project Overview */}
      <h2 className="lg:text-3xl text-h3 font-bold text-brand-dark">
        Project Overview
      </h2>
      <div className="grid grid-cols-2 gap-sm md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-brand-dark/10 p-sm"
          >
            <p className="leading-none lg:text-2xl text-h3 font-bold text-brand-dark">
              {stat.value}{" "}
              <span className="lg:text-body-md text-body-sm font-medium">
                {stat.label}
              </span>
            </p>
            <p className="mt-xs lg:text-body-sm text-body-xs text-brand-dark/50">
              {stat.detail}
            </p>
          </div>
        ))}
      </div>

      <hr className="border-t border-brand-dark/10" />

      {/* Project Timeline & Sprint Velocity — only render when iterations exist */}
      {sprints && sprints.length > 0 ? (
        <ProjectTimeline
          sprints={sprints}
          currentSprint={currentSprint}
          totalSprints={totalSprints}
        />
      ) : (
        <div className="rounded-2xl bg-brand-surface p-lg shadow-md">
          <h3 className="text-body-lg font-semibold text-brand-dark">
            Project Timeline
          </h3>
          <p className="mt-sm text-body-sm text-brand-dark/70">
            No sprints have been synced yet. Set up an iteration field on your
            GitHub Project and assign tickets to it, then refresh.
          </p>
        </div>
      )}
    </div>
  );
}
