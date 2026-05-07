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
  // null before first sync, false if no iteration field, true if set up.
  iterationFieldConfigured?: boolean | null;
  // ISO date of the next iteration's start. Only set when iterations exist
  // but none cover today.
  nextSprintStart?: string | null;
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

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Page component that shows when the dashboard is loading or if it has an error
export default function Dashboard({
  status,
  statusMessage,
  repository: _repository,
  metrics,
  sprints,
  iterationFieldConfigured,
  nextSprintStart,
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

      {/* Sprint Velocity — branches on whether the iteration field is set up */}
      {sprints && sprints.length > 0 ? (
        <>
          <ProjectTimeline sprints={sprints} />
          {/* Iterations exist but none cover today — show the next start date */}
          {!sprints.some((s) => s.isCurrent) && nextSprintStart ? (
            <div className="rounded-2xl bg-brand-surface p-md shadow-md">
              <p className="text-body-sm text-brand-dark/70">
                No iteration is active right now. The next iteration starts on{" "}
                <span className="font-semibold text-brand-dark">
                  {formatDateLabel(nextSprintStart)}
                </span>
                .
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-2xl bg-brand-surface p-lg shadow-md">
          <h3 className="text-body-lg font-semibold text-brand-dark">
            Sprint Velocity
          </h3>
          {iterationFieldConfigured === false ? (
            <p className="mt-sm text-body-sm text-brand-dark/70">
              This repo&apos;s GitHub Project doesn&apos;t have an iteration
              field yet. Once you{" "}
              <a
                href="https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-iterations"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-accent underline"
              >
                add an iteration field
              </a>{" "}
              to your Project (or create a Project for this repo) and assign
              tickets to it, sprint metrics will appear here on the next sync.
            </p>
          ) : (
            <p className="mt-sm text-body-sm text-brand-dark/70">
              Your iteration field is set up but has no iterations yet. Create
              one in your GitHub Project, assign tickets to it, then refresh.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
