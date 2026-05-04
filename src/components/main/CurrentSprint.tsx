"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import BorderedPanel from "@/components/shared/BorderedPanel";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import ConfirmOverlay from "@/components/shared/ConfirmOverlay";
import PageContainer from "@/components/shared/PageContainer";
import SprintReviewPromptOverlay from "@/components/shared/SprintReviewPromptOverlay";

// Fetch all data required to display the current sprint metrics and pass it to the CurrentSprint component for rendering
type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type SprintTaskRow = {
  id: string;
  ref: string; // "#42" for linked issues, otherwise the task id
  title: string;
  status: TaskStatus;
};
type ContributorRow = {
  name: string;
  initials: string;
  avatarUrl: string | null;
  commits: number;
  prs: number;
  issues: number;
};
type TimelineRow = {
  date: string;
  text: string;
  initials: string;
  avatarUrl: string | null;
};

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
  contributors: Array<{
    name: string;
    commitCount: number;
    prCount: number;
    issueCount: number;
    avatarUrl: string | null;
  }>;
  // Tasks from the GitHub Project, linked to this sprint via the iteration field
  tasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    issueNumber: number | null;
  }>;
  taskBreakdown: { todo: number; inProgress: number; done: number };
  timeline: Array<{
    date: string | Date;
    text: string;
    initials: string;
    avatarUrl: string | null;
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

// Get a 1-2 letter avatar label from a name.
function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

// Stable per-name colour for the initials fallback.
const AVATAR_PALETTE = [
  "bg-brand-accent",
  "bg-brand-completed",
  "bg-brand-in-progress",
  "bg-brand-todo",
];

function avatarColorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

// Circular avatar — GitHub photo if we have one, else coloured initials.
function Avatar({
  name,
  initials,
  avatarUrl,
  size,
  className = "",
}: {
  name: string;
  initials: string;
  avatarUrl: string | null;
  size: number;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        title={name}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        unoptimized
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      title={name}
      className={`flex shrink-0 items-center justify-center rounded-full text-body-xs font-bold text-brand-surface ${avatarColorFor(
        name,
      )} ${className}`}
    >
      {initials}
    </span>
  );
}

// Helper function to create the task badge — colour and label match the breakdown tiles
function StatusBadge({ status }: { status: TaskStatus }) {
  const styles: Record<TaskStatus, string> = {
    TODO: "bg-brand-todo text-brand-surface",
    IN_PROGRESS: "bg-brand-in-progress text-brand-surface",
    DONE: "bg-brand-completed text-brand-surface",
  };
  const labels: Record<TaskStatus, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Done",
  };
  return (
    <span
      className={`inline-flex min-w-16 justify-center rounded-lg px-sm py-xs text-body-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
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

/** Title row: Generate Sprint Review, Finish Sprint, Refresh (same row as Refresh styling for the two sm buttons). */
function SprintPageHeader({
  title,
  onRefresh,
  onFinishSprint,
  isRefreshing,
  canRefresh,
  canFinishSprint,
}: {
  title: string;
  onRefresh: () => void;
  onFinishSprint: () => void;
  isRefreshing: boolean;
  canRefresh: boolean;
  canFinishSprint: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-md">
      <h2 className="min-w-0 max-w-full flex-1 text-h3 font-bold text-brand-dark lg:text-3xl">
        {title}
      </h2>
      <div className="flex w-full max-w-full shrink-0 flex-col gap-sm sm:w-auto sm:max-w-none sm:flex-row sm:flex-nowrap sm:items-center sm:justify-end sm:gap-md">
        <Button className="w-full sm:w-auto" size="lg">
          Generate Sprint Review
        </Button>
        <Button
          className="w-full sm:w-auto"
          variant="purple"
          size="sm"
          type="button"
          onClick={onFinishSprint}
          disabled={!canFinishSprint}
        >
          Finish Sprint
        </Button>
        <Button
          className="w-full sm:w-auto"
          variant="purple"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing || !canRefresh}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
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
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [sprintReviewPromptOpen, setSprintReviewPromptOpen] = useState(false);
  const [isFinishingSprint, setIsFinishingSprint] = useState(false);

  useEffect(() => {
    if (status !== "ready") {
      setFinishConfirmOpen(false);
      setSprintReviewPromptOpen(false);
    }
  }, [status]);

  const openFinishSprintConfirm = useCallback(() => {
    if (!groupId || !sprint) return;
    setFinishConfirmOpen(true);
  }, [groupId, sprint]);

  const confirmFinishSprint = useCallback(async () => {
    if (!groupId || !sprint) return;
    setIsFinishingSprint(true);
    try {
      // TODO: POST/PATCH to complete current sprint for this group.
      setFinishConfirmOpen(false);
      setSprintReviewPromptOpen(true);
    } finally {
      setIsFinishingSprint(false);
    }
  }, [groupId, sprint]);

  const dismissSprintReviewPrompt = useCallback(() => {
    setSprintReviewPromptOpen(false);
    router.refresh();
  }, [router]);

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

  const sprintTasks: SprintTaskRow[] = useMemo(
    () =>
      (metrics?.tasks || []).map((task) => ({
        id: task.id,
        ref: task.issueNumber ? `#${task.issueNumber}` : "",
        title: task.title,
        status: task.status,
      })),
    [metrics?.tasks],
  );

  const contributors: ContributorRow[] = useMemo(
    () =>
      (metrics?.contributors || []).map((contributor) => ({
        name: contributor.name,
        initials: getInitials(contributor.name),
        avatarUrl: contributor.avatarUrl,
        commits: contributor.commitCount,
        prs: contributor.prCount,
        issues: contributor.issueCount,
      })),
    [metrics?.contributors],
  );

  const timeline: TimelineRow[] = useMemo(
    () =>
      (metrics?.timeline || []).map((item) => ({
        date: formatShortDate(item.date),
        text: item.text,
        initials: item.initials,
        avatarUrl: item.avatarUrl,
      })),
    [metrics?.timeline],
  );

  const filteredSprintTasks = useMemo(() => {
    if (issueFilter === "todo") {
      return sprintTasks.filter((t) => t.status === "TODO");
    }
    if (issueFilter === "in_progress") {
      return sprintTasks.filter((t) => t.status === "IN_PROGRESS");
    }
    if (issueFilter === "done") {
      return sprintTasks.filter((t) => t.status === "DONE");
    }
    return sprintTasks;
  }, [issueFilter, sprintTasks]);

  if (status === "error") {
    return (
      <div className="min-h-screen bg-brand-background">
        <PageContainer>
          <Card className="space-y-md border border-brand-dark/10 p-xl shadow-none">
            <SprintPageHeader
              title="Current Sprint"
              onRefresh={handleRefresh}
              onFinishSprint={openFinishSprintConfirm}
              isRefreshing={isRefreshing}
              canRefresh={Boolean(groupId)}
              canFinishSprint={false}
            />
            {refreshError ? (
              <p className="text-body-md text-red-700">{refreshError}</p>
            ) : null}
            <p className="text-body-md text-brand-dark/70">
              {statusMessage ?? "Failed to load current sprint."}
            </p>
          </Card>
        </PageContainer>
      </div>
    );
  }

  if (status === "empty" || !sprint) {
    return (
      <div className="min-h-screen bg-brand-background">
        <PageContainer>
          <Card className="space-y-md border border-brand-dark/10 p-xl shadow-none">
            <SprintPageHeader
              title="Current Sprint"
              onRefresh={handleRefresh}
              onFinishSprint={openFinishSprintConfirm}
              isRefreshing={isRefreshing}
              canRefresh={Boolean(groupId)}
              canFinishSprint={false}
            />
            {refreshError ? (
              <p className="text-body-md text-red-700">{refreshError}</p>
            ) : null}
            <p className="text-body-md text-brand-dark/70">
              {statusMessage ?? "No current sprint available."}
            </p>
          </Card>
        </PageContainer>
      </div>
    );
  }

  const todoCount = metrics?.taskBreakdown.todo ?? 0;
  const inProgressCount = metrics?.taskBreakdown.inProgress ?? 0;
  const doneCount = metrics?.taskBreakdown.done ?? 0;

  // Display the current sprint page with the fetched metrics
  return (
    <>
      <div className="min-h-screen bg-brand-background">
        <PageContainer>
          <Card className="border border-brand-dark/10 shadow-none">
            <div className="space-y-lg">
              {refreshError ? (
                <p className="text-body-md">{refreshError}</p>
              ) : null}

              {/* Current Sprint */}
              <SprintPageHeader
                title={sprint.name}
                onRefresh={handleRefresh}
                onFinishSprint={openFinishSprintConfirm}
                isRefreshing={isRefreshing}
                canRefresh={Boolean(groupId)}
                canFinishSprint={Boolean(groupId)}
              />

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
                          label="All"
                          active={issueFilter === "all"}
                          onClick={() => setIssueFilter("all")}
                        />
                        <FilterChip
                          label="To Do"
                          active={issueFilter === "todo"}
                          onClick={() => setIssueFilter("todo")}
                        />
                        <FilterChip
                          label="In Progress"
                          active={issueFilter === "in_progress"}
                          onClick={() => setIssueFilter("in_progress")}
                        />
                        <FilterChip
                          label="Done"
                          active={issueFilter === "done"}
                          onClick={() => setIssueFilter("done")}
                        />
                      </div>

                      <div className="mt-lg max-h-42 overflow-y-auto pr-sm">
                        <div className="space-y-md">
                          {filteredSprintTasks.length === 0 ? (
                            <p className="text-body-md text-brand-dark/60">
                              No tasks linked to this sprint. Assign tickets to
                              this iteration in your GitHub Project to see them
                              here.
                            </p>
                          ) : (
                            filteredSprintTasks.map((task) => (
                              <div
                                key={task.id}
                                className="grid grid-cols-[5rem_1fr_6rem] items-center border-b border-brand-dark/10 pb-sm text-body-md"
                              >
                                <span className="text-brand-dark/60">
                                  {task.ref}
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

                      <div className="mt-md max-h-36 space-y-md overflow-y-auto pr-sm">
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

                              <Avatar
                                name={item.text}
                                initials={item.initials}
                                avatarUrl={item.avatarUrl}
                                size={24}
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </BorderedPanel>
                  </div>

                  {/* Contribution Breakdown */}
                  <div className="lg:relative">
                    <BorderedPanel className="p-md lg:absolute lg:inset-0 lg:flex lg:flex-col">
                      <div>
                        <h4 className="text-body-lg font-semibold text-brand-dark">
                          Contribution · this sprint
                        </h4>
                        <p className="text-body-xs text-brand-dark/50">
                          By person
                        </p>
                      </div>

                      <div className="mt-md overflow-y-auto pr-xs lg:min-h-0 lg:flex-1">
                        {contributors.length === 0 ? (
                          <p className="text-body-md text-brand-dark/60">
                            No contributor activity in this sprint period.
                          </p>
                        ) : (
                          contributors.map((person, index) => {
                            const total =
                              person.commits + person.prs + person.issues;
                            return (
                              <div
                                key={person.name}
                                className={`grid grid-cols-[2rem_1fr_auto] items-center gap-md py-sm ${
                                  index === 0
                                    ? ""
                                    : "border-t border-brand-dark/10"
                                }`}
                              >
                                <Avatar
                                  name={person.name}
                                  initials={person.initials}
                                  avatarUrl={person.avatarUrl}
                                  size={32}
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-body-md font-medium text-brand-dark">
                                    {person.name}
                                  </p>
                                  <p className="text-body-xs text-brand-dark/60">
                                    {person.commits} commits · {person.prs} PRs
                                    · {person.issues} issues
                                  </p>
                                </div>
                                <span className="text-body-sm text-brand-dark/50">
                                  {total}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </BorderedPanel>
                  </div>
                </div>
              </section>
            </div>
          </Card>
        </PageContainer>
      </div>
      <ConfirmOverlay
        open={finishConfirmOpen}
        onClose={() => {
          if (!isFinishingSprint) setFinishConfirmOpen(false);
        }}
        onConfirm={() => {
          void confirmFinishSprint();
        }}
        title="Are you sure you want to finish this sprint?"
        description="You can cancel to keep working in this sprint, or confirm to finish it."
        confirmLabel="Yes"
        cancelLabel="Cancel"
        isConfirming={isFinishingSprint}
      />
      <SprintReviewPromptOverlay
        open={sprintReviewPromptOpen}
        onClose={dismissSprintReviewPrompt}
      />
    </>
  );
}
