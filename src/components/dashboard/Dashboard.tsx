import HelpOverlayTrigger from "@/components/shared/HelpOverlayTrigger";
import PageContainer from "@/components/shared/PageContainer";
import ContributionBreakdownCard from "./ContributionBreakdownCard";
import EndProjectButton from "./EndProjectButton";
import SprintVelocityCard from "./SprintVelocityCard";
import StatsRow from "./StatsRow";

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
  groupId?: string;
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

// Page component that shows when the dashboard is loading or if it has an error
export default function Dashboard({
  status,
  statusMessage,
  repository: _repository,
  metrics,
  sprints,
  iterationFieldConfigured,
  nextSprintStart,
  repoContributors,
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
      />
    );
  }

  if (!metrics) {
    return (
      <StatusBlock message="Cannot render dashboard: metrics data is missing." />
    );
  }

  // Display the dashboard with the fetched metrics and timeline chart
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <div className="space-y-lg">
          <div className="mb-lg flex flex-col items-start justify-between gap-md sm:flex-row sm:items-start">
            <div>
              <h1 className="text-h2 font-bold text-brand-dark">
                Project Overview
              </h1>
              <p className="mt-xs text-body-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
                Project metrics
              </p>
            </div>
            <HelpOverlayTrigger
              label="Help: dashboard and sprints"
              title="Sprints on the dashboard"
              className="self-start sm:pt-1"
            >
              <div className="space-y-3 text-left">
                <p>
                  High-level counts and charts reflect activity in your linked
                  repository and GitHub Project.
                </p>
                <p>
                  Sprint velocity uses{" "}
                  <span className="font-semibold">completed iterations</span>{" "}
                  synced from GitHub. If sprints look empty, confirm your
                  project has an iteration field and that you&apos;ve run a sync
                  from the app after connecting the repo.
                </p>
              </div>
            </HelpOverlayTrigger>
            {groupId ? <EndProjectButton groupId={groupId} /> : null}
          </div>

          {/* Headline stat cards */}
          <StatsRow metrics={metrics} />

          {/* Sprint velocity + repository contribution breakdown */}
          <div className="grid gap-lg lg:grid-cols-[6fr_4fr]">
            <SprintVelocityCard
              sprints={sprints}
              iterationFieldConfigured={iterationFieldConfigured}
              nextSprintStart={nextSprintStart}
            />
            <ContributionBreakdownCard contributors={repoContributors ?? []} />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
