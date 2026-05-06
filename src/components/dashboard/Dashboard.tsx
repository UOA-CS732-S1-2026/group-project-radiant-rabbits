import Avatar from "@/components/shared/Avatar";
import Card from "@/components/shared/Card";
import PageContainer from "@/components/shared/PageContainer";

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
  // Top contributors with their contribution counts
  repoContributors?: Array<{
    name: string;
    initials: string;
    avatarUrl: string | null;
    commits: number;
    prs: number;
    issues: number;
    colour: string;
  }>;
};

// Reusable status/error block so every failure surfaces in the dashboard UI
function StatusBlock({ message }: { message: string }) {
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <div className="space-y-lg">
          <h2 className="text-h3 font-bold text-brand-dark">
            Project Overview
          </h2>
          <p className="mt-sm text-body-sm text-brand-dark/70">{message}</p>
        </div>
      </PageContainer>
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

// Helper to format dates in the dashboard
type MiniSeriesPoint = {
  label: string;
  value: number;
  projected?: boolean;
  active?: boolean;
};

// Helper to build the contribution bars in the dashboard
type ContributorRow = {
  name: string;
  initials: string;
  avatarUrl: string | null;
  commits: number;
  prs: number;
  issues: number;
  colour: string;
};

// Function to build the velocity chart in the dashboard
function MiniVelocityChart({ data }: { data: MiniSeriesPoint[] }) {
  const w = 760;
  const h = 240;
  const pad = { l: 26, r: 40, t: 12, b: 32 };
  const safeData = data.length > 0 ? data : [{ label: "S1", value: 0 }];
  const max = Math.max(...safeData.map((point) => point.value), 10);
  const xs = (index: number) =>
    pad.l + (index * (w - pad.l - pad.r)) / Math.max(1, safeData.length - 1);
  const ys = (value: number) => pad.t + (1 - value / max) * (h - pad.t - pad.b);
  const points = safeData.map((point, index) => ({
    x: xs(index),
    y: ys(point.value),
  }));
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  const area = `${path} L${points[points.length - 1].x},${h - pad.b} L${points[0].x},${h - pad.b} Z`;

  // Build the chart with svg elements
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-full w-full flex-1"
      role="img"
      aria-label="Sprint velocity chart"
    >
      <defs>
        <linearGradient
          id="dashboard-velocity-fill"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor="var(--color-brand-accent)"
            stopOpacity="0.20"
          />
          <stop
            offset="100%"
            stopColor="var(--color-brand-accent)"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      {[0, max / 2, max].map((tick) => {
        const y = ys(tick);
        return (
          <g key={String(tick)}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={y}
              y2={y}
              stroke="var(--color-brand-dark)"
              strokeOpacity="0.08"
            />
            <text
              x={pad.l - 8}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-brand-dark)"
              fillOpacity="0.45"
            >
              {Math.round(tick)}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#dashboard-velocity-fill)" />
      <path
        d={path}
        fill="none"
        stroke="var(--color-brand-accent)"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((point, index) => (
        <circle
          key={safeData[index].label}
          cx={point.x}
          cy={point.y}
          r="3.25"
          fill="var(--brand-surface)"
          stroke="var(--color-brand-accent)"
          strokeWidth="1.75"
        />
      ))}
      {safeData.map((point, index) => (
        <text
          key={point.label}
          x={points[index].x}
          y={h - 7}
          textAnchor="middle"
          fontSize="10.5"
          fill="var(--color-brand-dark)"
          fillOpacity="0.58"
        >
          {point.label}
        </text>
      ))}
    </svg>
  );
}

// Function to build the contribution bars in the dashboard
function RepoContributionBars({ rows }: { rows: ContributorRow[] }) {
  const max = Math.max(
    ...rows.map((row) => row.commits + row.prs + row.issues),
    1,
  );

  // Build the contribution bars with divs and dynamic widths based on the contribution counts
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-lg">
        {rows.map((row) => {
          const total = row.commits + row.prs + row.issues;
          return (
            <div
              key={row.name}
              className="grid grid-cols-[110px_1fr_48px] items-center gap-md"
            >
              <div className="flex items-center gap-sm min-w-0">
                <Avatar
                  name={row.name}
                  initials={row.initials}
                  avatarUrl={row.avatarUrl}
                  size={24}
                />
                <span className="truncate text-body-sm font-medium text-brand-dark">
                  {row.name}
                </span>
              </div>
              <div className="flex h-5 overflow-hidden rounded-full bg-brand-dark/5">
                <div
                  className="bg-brand-accent"
                  style={{ width: `${(row.commits / max) * 100}%` }}
                />
                <div
                  className="bg-brand-completed/60"
                  style={{ width: `${(row.prs / max) * 100}%` }}
                />
                <div
                  className="bg-brand-in-progress/70"
                  style={{ width: `${(row.issues / max) * 100}%` }}
                />
              </div>
              <div className="text-right text-body-xs font-semibold text-brand-dark/60">
                {total}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-auto flex flex-wrap gap-md pt-md text-body-xs text-brand-dark/50">
        <span className="inline-flex items-center gap-xs">
          <span className="h-2 w-2 rounded-full bg-brand-accent" />
          Commits
        </span>
        <span className="inline-flex items-center gap-xs">
          <span className="h-2 w-2 rounded-full bg-brand-completed/60" />
          PRs
        </span>
        <span className="inline-flex items-center gap-xs">
          <span className="h-2 w-2 rounded-full bg-brand-in-progress/70" />
          Issues
        </span>
      </div>
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
  iterationFieldConfigured,
  nextSprintStart,
  repoContributors: repoContributorsDataProp,
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

  // Build the contributor rows for the contribution bars
  const repoContributors: ContributorRow[] =
    repoContributorsDataProp?.map((contributor) => ({
      name: contributor.name,
      initials: contributor.initials,
      avatarUrl: contributor.avatarUrl,
      commits: contributor.commits,
      prs: contributor.prs,
      issues: contributor.issues,
      colour: contributor.colour,
    })) ?? [];

  // Build the velocity series for the velocity chart
  const velocitySeries: MiniSeriesPoint[] =
    sprints?.map((sprint, index) => ({
      label: sprint.name,
      value: sprint.velocity,
      active: sprint.isCurrent,
      projected: index === (sprints.length ?? 0) - 1 && !sprint.isCurrent,
    })) ?? [];

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
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <div className="space-y-lg">
          <div className="mb-lg flex flex-col items-start justify-between gap-md lg:flex-row lg:items-center">
            <div>
              <h1 className="text-h2 font-bold text-brand-dark">
                Project Overview
              </h1>
              <p className="mt-xs text-body-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
                Project metrics
              </p>
            </div>
          </div>

          {/* Stat cards; 4 column grid */}
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
                <p className="mt-sm text-body-xs text-brand-dark/60">
                  {stat.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-lg lg:grid-cols-[7fr_3fr]">
            <Card className="flex flex-col p-md">
              <div className="mb-md flex items-start justify-between gap-md">
                <div>
                  <p className="mb-xs text-body-xs font-semibold uppercase tracking-[0.14em] text-brand-dark/45">
                    Sprint velocity
                  </p>
                  <h3 className="text-body-lg font-semibold text-brand-dark">
                    Smaller sprint view
                  </h3>
                  <p className="text-body-xs text-brand-dark/50">
                    Total number of issues closed per sprint
                  </p>
                </div>
                <span className="rounded-md bg-brand-accent/10 px-sm py-xs text-body-xs font-medium text-brand-accent">
                  {sprints?.length ?? 0} iterations
                </span>
              </div>
              {velocitySeries.length > 0 ? (
                <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-brand-dark/10 bg-brand-surface p-md">
                  <div className="flex max-h-68 min-h-55 flex-1 items-stretch">
                    <MiniVelocityChart data={velocitySeries} />
                  </div>
                  {sprints &&
                  !sprints.some((s) => s.isCurrent) &&
                  nextSprintStart ? (
                    <p className="mt-md text-body-sm text-brand-dark/60">
                      No iteration is active right now. The next iteration
                      starts on{" "}
                      <span className="font-semibold text-brand-dark">
                        {formatDateLabel(nextSprintStart)}
                      </span>
                      .
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-brand-dark/10 bg-brand-surface p-md">
                  {iterationFieldConfigured === false ? (
                    <p className="text-body-sm text-brand-dark/60">
                      This repo&apos;s GitHub Project doesn&apos;t have an
                      iteration field yet. Once you{" "}
                      <a
                        href="https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-iterations"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-brand-accent underline"
                      >
                        add an iteration field
                      </a>{" "}
                      to your Project (or create a Project for this repo) and
                      assign tickets to it, sprint metrics will appear here on
                      the next sync.
                    </p>
                  ) : (
                    <p className="text-body-sm text-brand-dark/60">
                      Your iteration field is set up but has no iterations yet.
                      Create one in your GitHub Project, assign tickets to it,
                      then refresh.
                    </p>
                  )}
                </div>
              )}
            </Card>

            <Card className="flex flex-col p-md">
              <div className="mb-md flex items-start justify-between gap-md">
                <div>
                  <p className="mb-xs text-body-xs font-semibold uppercase tracking-[0.14em] text-brand-dark/45">
                    Repository contribution
                  </p>
                  <h3 className="text-body-lg font-semibold text-brand-dark">
                    Contribution breakdown
                  </h3>
                  <p className="text-body-xs text-brand-dark/50">
                    Total work across the repo, by person
                  </p>
                </div>
              </div>
              <div className="flex flex-1 flex-col">
                <RepoContributionBars rows={repoContributors} />
              </div>
            </Card>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
