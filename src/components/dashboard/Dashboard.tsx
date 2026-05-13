import HelpOverlayTrigger from "@/components/shared/HelpOverlayTrigger";
import PageContainer from "@/components/shared/PageContainer";
import AutoRefresh from "./AutoRefresh";
import ContributionBreakdownCard from "./ContributionBreakdownCard";
import EndProjectButton from "./EndProjectButton";
import ProjectMetricsGrid from "./ProjectMetricsGrid";
import SprintVelocityCard from "./SprintVelocityCard";

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
  // Already limited by the server so the dashboard card can stay dense and
  // predictable on small screens.
  repoContributors?: Array<{
    name: string;
    initials: string;
    avatarUrl: string | null;
    commits: number;
    prs: number;
    issues: number;
    colour: string;
  }>;
  repoActivityTotals?: {
    commits: number;
    prs: number;
    issues: number;
  };
  groupId?: string;
};

function StatusBlock({
  message,
  autoRefresh = false,
}: {
  message: string;
  autoRefresh?: boolean;
}) {
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <div className="space-y-lg">
          <h1 className="text-(length:--text-h2) font-bold text-brand-dark">
            Project Overview
          </h1>
          <p className="mt-sm text-(length:--text-body-sm) text-brand-dark/70">
            {message}
          </p>
        </div>
      </PageContainer>
      {/* Initial sync is asynchronous; polling the server component keeps the
          loading screen simple without duplicating sync state on the client. */}
      {autoRefresh && <AutoRefresh />}
    </div>
  );
}

export default function Dashboard({
  status,
  statusMessage,
  repository: _repository,
  metrics,
  sprints,
  iterationFieldConfigured,
  nextSprintStart,
  repoContributors,
  repoActivityTotals,
  groupId,
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
        autoRefresh={status === "loading"}
      />
    );
  }

  if (!metrics) {
    return (
      <StatusBlock message="Cannot render dashboard: metrics data is missing." />
    );
  }

  const hasVelocityChart = Boolean(sprints && sprints.length > 0);
  const iterationGuidanceVariant =
    iterationFieldConfigured === false ? "no-field" : "no-iterations";

  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <div className="space-y-lg">
          <div className="mb-lg w-full min-w-0 space-y-sm md:space-y-md">
            <div className="flex flex-col items-start justify-between gap-md sm:flex-row sm:items-start">
              <div>
                <h1 className="text-(length:--text-h2) font-bold text-brand-dark">
                  Project Overview
                </h1>
                <p className="mt-xs text-(length:--text-body-md) font-semibold uppercase tracking-[0.14em] text-brand-accent-dark">
                  Project metrics
                </p>
              </div>
              <div className="flex items-center gap-sm self-start sm:self-auto">
                <HelpOverlayTrigger
                  label="Help: dashboard and sprints"
                  title="Sprints on the dashboard"
                >
                  <div className="space-y-3 text-left">
                    <p>
                      High-level counts and charts reflect activity in your
                      linked repository and GitHub Project.
                    </p>
                    <p>
                      Sprint velocity uses{" "}
                      <span className="font-semibold">
                        completed iterations
                      </span>{" "}
                      synced from GitHub. If sprints look empty, confirm your
                      project has an iteration field and that you&apos;ve run a
                      sync from the app after connecting the repo.
                    </p>
                  </div>
                </HelpOverlayTrigger>
                {groupId ? <EndProjectButton groupId={groupId} /> : null}
              </div>
            </div>
            <ProjectMetricsGrid
              metrics={metrics}
              sprintVelocityGuidance={
                hasVelocityChart
                  ? undefined
                  : { variant: iterationGuidanceVariant }
              }
            />
          </div>

          <div className="grid gap-lg lg:grid-cols-[6fr_4fr]">
            <SprintVelocityCard
              sprints={sprints}
              iterationFieldConfigured={iterationFieldConfigured}
              nextSprintStart={nextSprintStart}
            />
            <ContributionBreakdownCard
              contributors={repoContributors ?? []}
              totals={repoActivityTotals}
            />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
