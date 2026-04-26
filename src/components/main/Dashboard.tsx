import type { Sprint } from "@/components/main/ProjectTimeline";
import ProjectTimeline from "@/components/main/ProjectTimeline";

// Fetch all data required to display the dashboard metrics and pass it to the Dashboard component for rendering
type RepositoryInfo = {
  owner?: string | null;
  name?: string | null;
  isConnected: boolean;
  syncStatus?: string | null;
  syncError?: string | null;
  validationError?: string | null;
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
  timeline?: {
    projectStartDate?: Date | string | null;
    projectEndDate?: Date | string | null;
    sprintLengthDays?: number | null;
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Reusable status/error block so every failure surfaces in the dashboard UI
function StatusBlock({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-brand-surface p-lg shadow-md">
      <h2 className="text-h3 font-bold text-brand-dark">Project Overview</h2>
      <p className="mt-sm text-body-sm text-brand-dark/70">{message}</p>
    </div>
  );
}

type SprintProgress =
  | { ok: true; currentSprint: number; totalSprints: number }
  | { ok: false; error: string };

// Helper function to compute current sprint and total sprints based on project timeline
function computeSprintProgress(
  timeline?: DashboardProps["timeline"],
): SprintProgress {
  const start = timeline?.projectStartDate
    ? new Date(timeline.projectStartDate)
    : null;
  const end = timeline?.projectEndDate
    ? new Date(timeline.projectEndDate)
    : null;

  // Check that all the required information is fetched to build the dashboard
  // If any of the required timeline information is missing or invalid, return the error UI with the error message
  if (
    !start ||
    !end ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return {
      ok: false,
      error:
        "Project timeline is missing or invalid: a valid project start and end date are required.",
    };
  }

  if (!timeline?.sprintLengthDays || timeline.sprintLengthDays <= 0) {
    return {
      ok: false,
      error:
        "Sprint length is missing or invalid: a positive sprint length is required.",
    };
  }

  const sprintLength = timeline.sprintLengthDays;

  const totalSprints = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (sprintLength * DAY_MS)),
  );

  const elapsedDays = (Date.now() - start.getTime()) / DAY_MS;
  const rawCurrent = Math.floor(elapsedDays / sprintLength) + 1;
  const currentSprint = Math.min(Math.max(rawCurrent, 1), totalSprints);

  return { ok: true, currentSprint, totalSprints };
}

// Page component that shows when the dashboard is loading or if it has an error
export default function Dashboard({
  status,
  statusMessage,
  repository: _repository,
  metrics,
  timeline,
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

  // Placeholder data for the timeline chart until sprint velocity calculation is implemented
  const defaultSprints: Sprint[] = [
    { name: "Sprint 1", velocity: 5 },
    { name: "Sprint 2", velocity: 12 },
    { name: "Sprint 3", velocity: 18 },
    { name: "Sprint 4", velocity: 28 },
    { name: "Sprint 5", velocity: 38 },
    { name: "Sprint 6", velocity: 45 },
    { name: "Sprint 7", velocity: 50 },
    { name: "Sprint 8", velocity: 55 },
  ];
  const sprintProgress = computeSprintProgress(timeline);
  if (!sprintProgress.ok) {
    return <StatusBlock message={sprintProgress.error} />;
  }
  const { currentSprint, totalSprints } = sprintProgress;

  // Display the dashboard with the fetched metrics and timeline chart
  return (
    <div className="flex flex-col gap-lg">
      {/* Project Overview */}
      <div className="rounded-2xl bg-brand-surface p-lg shadow-md">
        <h2 className="mb-md text-h3 font-bold text-brand-dark">
          Project Overview
        </h2>
        <div className="grid grid-cols-2 gap-md md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-brand-dark/10 p-md"
            >
              <p className="text-h2 font-bold text-brand-dark">
                {stat.value}{" "}
                <span className="text-body-sm font-medium">{stat.label}</span>
              </p>
              <p className="mt-xs text-body-xs text-brand-dark/50">
                {stat.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Project Timeline & Sprint Velocity */}
      <ProjectTimeline
        sprints={defaultSprints}
        currentSprint={currentSprint}
        totalSprints={totalSprints}
      />
    </div>
  );
}
