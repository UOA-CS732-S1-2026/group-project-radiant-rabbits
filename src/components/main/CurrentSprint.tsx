"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import BorderedPanel from "@/components/shared/BorderedPanel";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import PageContainer from "@/components/shared/PageContainer";

// Fetch all data required to display the current sprint metrics and pass it to the CurrentSprint component for rendering
type SprintTask = { id: string; title: string; status: "Open" | "Closed" };
type ContributorRow = { name: string; commits: string; issue: string };
type TimelineRow = { date: string; text: string; initials: string };

type SprintInfo = {
  id: string;
  number: number;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  status: "PLANNING" | "ACTIVE" | "COMPLETED";
  progress: {
    totalDays: number;
    elapsedDays: number;
    remainingDays: number;
    progressPercent: number;
  };
};

type SprintMetrics = {
  issuesCreated: number;
  commitsCount: number;
  pullRequestsOpened: number;
  pullRequestsMerged: number;
  activeContributors: number;
  contributors: Array<{ name: string; commitCount: number }>;
  issues: Array<{
    id: string;
    number: number;
    title: string;
    status: "Open" | "Closed";
    createdAt: string | Date;
  }>;
  timeline: Array<{
    date: string | Date;
    text: string;
    initials: string;
  }>;
};

type CurrentSprintProps = {
  status: "ready" | "empty" | "error";
  statusMessage?: string;
  groupId?: string;
  sprint?: SprintInfo;
  metrics?: SprintMetrics;
};

// Helper functions for formatting dates
function formatDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
  });
}

// Helper function to create the issue badge with different colors based on open vs closed status
function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "Closed"
      ? "bg-brand-completed text-brand-surface"
      : "bg-brand-open text-brand-surface";

  return (
    <span
      className={`inline-flex min-w-16 justify-center rounded-lg px-sm py-xs text-body-xs font-medium ${styles}`}
    >
      {status}
    </span>
  );
}

// Helper function to create the breakdown tiles for the sprint overview section
function BreakdownTile({
  label,
  value,
  dotClass,
}: {
  label: string;
  value: string;
  dotClass: string;
}) {
  return (
    <BorderedPanel shadow>
      <div className="flex items-center gap-sm">
        <span className={`h-sm w-sm rounded-full ${dotClass}`} />
        <span className="text-body-md font-medium text-brand-dark">
          {label}
        </span>
      </div>
      <p className="mt-xs pl-lg text-body-md text-brand-dark/60">{value}</p>
    </BorderedPanel>
  );
}

// Helper function to create the filter chips for issue status filtering in the sprint tasks section
function FilterChip({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-brand-surface px-sm py-xs text-body-xs font-medium text-brand-dark shadow-sm"
          : "rounded-md px-sm py-xs text-body-xs text-brand-dark/70 transition hover:text-brand-dark"
      }
    >
      {label}
    </button>
  );
}

// Helper function to compute the status message for the sprint
function StatusBlock({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-brand-background">
      <PageContainer>
        <Card className="border border-brand-dark/10 p-xl shadow-none">
          <p className="text-body-md text-brand-dark/70">{message}</p>
        </Card>
      </PageContainer>
    </div>
  );
}

// Page component that shows when the current sprint is loading or if it has an error
export default function CurrentSprint({
  status,
  statusMessage,
  groupId,
  sprint,
  metrics,
}: CurrentSprintProps) {
  const router = useRouter();
  const [issueFilter, setIssueFilter] = useState<string>("all");
  const [isRefreshing, startRefresh] = useTransition();
  const [refreshError, setRefreshError] = useState("");

  const handleRefresh = useCallback(() => {
    if (!groupId) return;

    startRefresh(async () => {
      try {
        setRefreshError("");
        const syncResponse = await fetch(`/api/groups/${groupId}/sync`, {
          method: "POST",
        });

        // 409 means a sync is already in progress, treat as success
        if (!syncResponse.ok && syncResponse.status !== 409) {
          const syncPayload = (await syncResponse.json().catch(() => ({}))) as {
            error?: string;
          };
          setRefreshError(syncPayload.error ?? "Failed to refresh GitHub data");
          return;
        }

        router.refresh();
      } catch (error: unknown) {
        setRefreshError(
          error instanceof Error
            ? error.message
            : "Failed to refresh GitHub data",
        );
      }
    });
  }, [groupId, router]);

  const sprintTasks: SprintTask[] = useMemo(
    () =>
      (metrics?.issues || []).map((issue) => ({
        id: `#${issue.number}`,
        title: issue.title,
        status: issue.status,
      })),
    [metrics?.issues],
  );

  const contributors: ContributorRow[] = useMemo(
    () =>
      (metrics?.contributors || []).map((contributor) => ({
        name: contributor.name,
        commits: `${contributor.commitCount} Commits`,
        issue: `${metrics?.issuesCreated ?? 0} issues in this sprint`,
      })),
    [metrics?.contributors, metrics?.issuesCreated],
  );

  const timeline: TimelineRow[] = useMemo(
    () =>
      (metrics?.timeline || []).map((item) => ({
        date: formatShortDate(item.date),
        text: item.text,
        initials: item.initials,
      })),
    [metrics?.timeline],
  );

  const filteredSprintTasks = useMemo(() => {
    if (issueFilter === "open") {
      return sprintTasks.filter((t) => t.status === "Open");
    }
    if (issueFilter === "closed") {
      return sprintTasks.filter((t) => t.status === "Closed");
    }
    return sprintTasks;
  }, [issueFilter, sprintTasks]);

  if (status === "error") {
    return (
      <StatusBlock
        message={statusMessage ?? "Failed to load current sprint."}
      />
    );
  }

  if (status === "empty" || !sprint) {
    return (
      <StatusBlock message={statusMessage ?? "No current sprint available."} />
    );
  }

  const todoCount = sprintTasks.filter((task) => task.status === "Open").length;
  const doneCount = sprintTasks.filter(
    (task) => task.status === "Closed",
  ).length;
  const inProgressCount = 0;

  // Display the current sprint page with the fetched metrics
  return (
    <div className="min-h-screen bg-brand-background">
      <PageContainer>
        <Card className="border border-brand-dark/10 p-xl shadow-none">
          <div className="space-y-lg">
            {refreshError ? (
              <p className="text-body-md">{refreshError}</p>
            ) : null}

            {/* Current Sprint */}
            <div className="flex items-start justify-between gap-md">
              <h2 className="text-h2 font-semibold text-brand-dark">
                {sprint.name}
              </h2>
              <Button
                variant="purple"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            {/* Sprint Focus */}
            <BorderedPanel as="section">
              <div className="flex items-start justify-between gap-md">
                <div>
                  <h3 className="text-body-lg font-medium text-brand-dark">
                    Sprint Focus:
                  </h3>
                  <p className="text-body-lg text-brand-dark/60">
                    EMPTY: PLACEHOLDER
                  </p>
                </div>

                <span className="text-body-md text-brand-dark/70">✎</span>
              </div>
            </BorderedPanel>

            {/* Sprint Timeline */}
            <BorderedPanel as="section">
              <div className="mb-md grid grid-cols-1 gap-sm text-body-md text-brand-dark/60 md:grid-cols-3">
                <p>
                  <span className="font-medium text-brand-dark">
                    Sprint Start Date:
                  </span>{" "}
                  {formatDate(sprint.startDate)}
                </p>
                <p>
                  <span className="font-medium text-brand-dark">
                    Sprint End Date:
                  </span>{" "}
                  {formatDate(sprint.endDate)}
                </p>
                <p>
                  <span className="font-medium text-brand-dark">
                    Time Remaining:
                  </span>{" "}
                  {sprint.progress.remainingDays} day
                  {sprint.progress.remainingDays === 1 ? "" : "s"}
                </p>
              </div>

              <div className="h-sm w-full rounded-full bg-brand-accent/20">
                <div
                  className="h-sm rounded-full bg-brand-accent"
                  style={{ width: `${sprint.progress.progressPercent}%` }}
                />
              </div>
            </BorderedPanel>

            {/* Sprint Breakdown */}
            <section>
              <h3 className="mb-md text-h3 font-semibold text-brand-dark">
                Sprint Breakdown
              </h3>

              <div className="grid gap-lg lg:grid-cols-[2.2fr_1fr]">
                <div className="space-y-md">
                  <BorderedPanel>
                    <div className="grid gap-md md:grid-cols-3">
                      <BreakdownTile
                        label="To Do"
                        value={`${todoCount} Issues`}
                        dotClass="bg-brand-todo"
                      />
                      <BreakdownTile
                        label="In Progress"
                        value={`${inProgressCount} Issues`}
                        dotClass="bg-brand-in-progress"
                      />
                      <BreakdownTile
                        label="Done"
                        value={`${doneCount} Issues`}
                        dotClass="bg-brand-completed"
                      />
                    </div>
                  </BorderedPanel>

                  {/* Sprint Tasks */}
                  <BorderedPanel>
                    <h4 className="text-body-lg font-semibold text-brand-dark">
                      Sprint Tasks
                    </h4>

                    <div className="inline-flex gap-0.5 rounded-md bg-brand-border p-1">
                      <FilterChip
                        label="All Issues"
                        active={issueFilter === "all"}
                        onClick={() => setIssueFilter("all")}
                      />
                      <FilterChip
                        label="Open"
                        active={issueFilter === "open"}
                        onClick={() => setIssueFilter("open")}
                      />
                      <FilterChip
                        label="Closed"
                        active={issueFilter === "closed"}
                        onClick={() => setIssueFilter("closed")}
                      />
                    </div>

                    <div className="mt-lg overflow-y-auto pr-sm">
                      <div className="space-y-md">
                        {filteredSprintTasks.length === 0 ? (
                          <p className="text-body-md text-brand-dark/60">
                            No issues found for this sprint period.
                          </p>
                        ) : (
                          filteredSprintTasks.map((task) => (
                            <div
                              key={task.id}
                              className="grid grid-cols-[5rem_1fr_5rem] items-center border-b border-brand-dark/10 pb-sm text-body-md"
                            >
                              <span className="text-brand-dark/60">
                                {task.id}
                              </span>
                              <span className="text-brand-dark/70">
                                {task.title}
                              </span>
                              <div className="flex justify-end">
                                <StatusBadge status={task.status} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </BorderedPanel>

                  {/* Activity Timeline */}
                  <BorderedPanel>
                    <h4 className="text-body-lg font-semibold text-brand-dark">
                      Activity Timeline
                    </h4>

                    <div className="mt-md space-y-md">
                      {timeline.length === 0 ? (
                        <p className="text-body-md text-brand-dark/60">
                          No activity captured for this sprint period.
                        </p>
                      ) : (
                        timeline.map((item, index) => (
                          <div
                            key={`${item.date}-${index}`}
                            className="grid grid-cols-[5rem_1fr_2.5rem] items-center gap-md border-b border-brand-dark/10 pb-sm"
                          >
                            <div className="text-body-md text-brand-dark/60">
                              {item.date}
                            </div>

                            <div className="flex items-center gap-sm text-body-md text-brand-dark/70">
                              <span className="text-brand-dark/40">↑</span>
                              <span>{item.text}</span>
                            </div>

                            <div className="flex h-lg w-lg items-center justify-center rounded-xl bg-brand-accent/50 text-body-xs font-medium text-brand-dark">
                              {item.initials}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </BorderedPanel>
                </div>

                {/* Contribution Breakdown */}
                <BorderedPanel>
                  <h4 className="text-body-lg font-semibold text-brand-dark">
                    Contribution Breakdown
                  </h4>

                  <div className="mt-md space-y-lg">
                    {contributors.length === 0 ? (
                      <p className="text-body-md text-brand-dark/60">
                        No contributor activity in this sprint period.
                      </p>
                    ) : (
                      contributors.map((person) => (
                        <div
                          key={person.name}
                          className="border-b border-brand-dark/10 pb-md"
                        >
                          <p className="text-body-lg font-semibold text-brand-dark">
                            {person.name}
                          </p>
                          <p className="mt-xs text-body-md text-brand-dark/50">
                            {person.commits}
                          </p>
                          <p className="text-body-md text-brand-dark/50">
                            {person.issue}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </BorderedPanel>
              </div>
            </section>
          </div>
        </Card>
      </PageContainer>
    </div>
  );
}
