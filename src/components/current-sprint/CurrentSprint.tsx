"use client";

import { group } from "console";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import ActivityTimeline from "@/components/current-sprint/ActivityTimeline";
import BreakdownCard from "@/components/current-sprint/BreakdownCard";
import ContributionCard from "@/components/current-sprint/ContributionCard";
import CurrentSprintStatusWithHelp from "@/components/current-sprint/CurrentSprintStatusWithHelp";
import SprintFocus from "@/components/current-sprint/SprintFocus";
import SprintTaskSection from "@/components/current-sprint/SprintTaskSection";
import SprintTimeline from "@/components/current-sprint/SprintTimeline";
import Button from "@/components/shared/Button";
import ConfirmOverlay from "@/components/shared/ConfirmOverlay";
import HelpOverlayTrigger from "@/components/shared/HelpOverlayTrigger";
import PageContainer from "@/components/shared/PageContainer";
import SprintGitHubTicketsOverlay from "@/components/shared/SprintGitHubTicketsOverlay";
import SprintReviewPreviewOverlay from "@/components/shared/SprintReviewPreviewOverlay";
import SprintReviewPromptOverlay from "@/components/shared/SprintReviewPromptOverlay";
import SprintWelcomeOverlay from "@/components/shared/SprintWelcomeOverlay";
import { getInitials } from "@/lib/formatters";
import type { GitHubIterationGuidanceVariant } from "@/lib/githubProjectDocs";

// Fetch all required data to display the current sprint metrics
type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

type NextSprintTaskRow = {
  id: string;
  ref: string;
  title: string;
  status: TaskStatus;
};

type Assignee = {
  name: string;
  initials: string;
  avatarUrl: string | null;
};

type SprintTaskRow = {
  id: string;
  ref: string; // "#42" for linked issues, otherwise the task id
  title: string;
  status: TaskStatus;
  assignees?: Assignee[];
  labels?: string[];
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
  goal?: string;
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
    assignees?: Array<{
      name: string;
      avatarUrl: string | null;
    }>;
    labels?: string[];
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
  iterationGuidanceVariant?: GitHubIterationGuidanceVariant;
  groupId?: string;
  groupName?: string;
  sprint?: SprintInfo;
  metrics?: SprintMetrics;
};

// Helper functions for formatting dates
function formatShortDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
  });
}

function formatSprintDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// Helper function to compute the status message for the sprint
function StatusBlock({ message }: { message: string }) {
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <p className="text-(length:--text-body-md) text-brand-dark/70">
          {message}
        </p>
      </PageContainer>
    </div>
  );
}

// Page component that shows when the current sprint is loading or if it has an error
export default function CurrentSprint({
  status,
  statusMessage,
  iterationGuidanceVariant,
  groupId,
  groupName,
  sprint,
  metrics,
}: CurrentSprintProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [refreshError, setRefreshError] = useState("");
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [sprintReviewPromptOpen, setSprintReviewPromptOpen] = useState(false);
  const [sprintReviewPreviewOpen, setSprintReviewPreviewOpen] = useState(false);
  const [nextSprintWelcomeOpen, setNextSprintWelcomeOpen] = useState(false);
  const [githubTicketsOverlayOpen, setGithubTicketsOverlayOpen] =
    useState(false);
  const pendingSprintFocusRef = useRef("");
  const [isFinishingSprint, setIsFinishingSprint] = useState(false);
  const [isSprintHandoffSubmitting, setIsSprintHandoffSubmitting] =
    useState(false);
  const [nextSprintTasks, setNextSprintTasks] = useState<NextSprintTaskRow[]>(
    [],
  );
  const [reviewText, setReviewText] = useState("");
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [transitionErrorOpen, setTransitionErrorOpen] = useState(false);
  const [transitionErrorMessage, setTransitionErrorMessage] = useState("");
  const [handoffErrorOpen, setHandoffErrorOpen] = useState(false);
  const [handoffErrorMessage, setHandoffErrorMessage] = useState("");

  useEffect(() => {
    if (status !== "ready") {
      setFinishConfirmOpen(false);
      setSprintReviewPromptOpen(false);
      setSprintReviewPreviewOpen(false);
      setNextSprintWelcomeOpen(false);
      setGithubTicketsOverlayOpen(false);
    }
  }, [status]);

  const handleSaveSprintFocus = async (newFocus: string) => {
    if (!groupId || !sprint?.id) return;

    try {
      const response = await fetch(
        `/api/groups/${groupId}/sprints/${sprint.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal: newFocus }),
        },
      );

      if (!response.ok) throw new Error("Failed to update focus");

      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to save sprint focus.");
    }
  };

  const handleGenerateReview = useCallback(async () => {
    if (!groupId || !sprint?.id) return;

    setReviewError("");
    setIsGeneratingReview(true);

    setSprintReviewPromptOpen(false);
    setSprintReviewPreviewOpen(true);

    try {
      const response = await fetch(
        `/api/groups/${groupId}/sprints/${sprint.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regenerate: false }),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to generate review");

      setReviewText(data.review);
    } catch (err) {
      console.error(err);
      setReviewError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGeneratingReview(false);
    }
  }, [groupId, sprint?.id]);

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

  const openFinishSprintConfirm = useCallback(() => {
    if (!groupId || !sprint) return;
    setFinishConfirmOpen(true);
  }, [groupId, sprint]);

  const confirmFinishSprint = useCallback(async () => {
    if (!groupId || !sprint) return;
    setIsFinishingSprint(true);
    try {
      setFinishConfirmOpen(false);
      setSprintReviewPromptOpen(true);
    } finally {
      setIsFinishingSprint(false);
    }
  }, [groupId, sprint]);

  const proceedFromWelcomeToGithubTickets = useCallback(
    async (sprintFocus: string) => {
      if (!groupId || !sprint) return;
      let shouldOpenTicketsOverlay = false;

      try {
        setIsSprintHandoffSubmitting(true);

        // Fetch all sprints for the group
        const sprintsResponse = await fetch(`/api/groups/${groupId}/sprints`);
        if (!sprintsResponse.ok) {
          throw new Error("Failed to load sprints");
        }

        const sprintList = await sprintsResponse.json();
        const sprints = Array.isArray(sprintList) ? sprintList : [];

        // Find the next planning sprint by startDate instead of name matching.
        // GitHub iteration titles are user-defined and not guaranteed to be
        // "Sprint N".
        const currentStartMs = new Date(sprint.startDate).getTime();
        const nextSprint = sprints
          .filter(
            (s: {
              _id?: string;
              startDate?: string;
              status?: "PLANNING" | "ACTIVE" | "COMPLETED";
            }) =>
              Boolean(s._id) &&
              s.status === "PLANNING" &&
              typeof s.startDate === "string" &&
              new Date(s.startDate).getTime() > currentStartMs,
          )
          .sort(
            (a: { startDate: string }, b: { startDate: string }) =>
              new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
          )[0];

        if (!nextSprint || !nextSprint._id) {
          setNextSprintWelcomeOpen(false);
          setNextSprintTasks([]);
          setHandoffErrorMessage(
            "No next planning sprint was found. Please ensure the next iteration exists in your GitHub Project and sync your group.",
          );
          setHandoffErrorOpen(true);
          return;
        } else {
          // Update next sprint's goal with the sprint focus
          const updateResponse = await fetch(
            `/api/groups/${groupId}/sprints/${nextSprint._id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ goal: sprintFocus?.trim() || "" }),
            },
          );

          if (!updateResponse.ok) {
            console.error("Failed to update next sprint goal");
          }

          // Fetch tasks for the next sprint
          const tasksResponse = await fetch(
            `/api/groups/${groupId}/sprints/${nextSprint._id}/tasks`,
          );

          if (tasksResponse.ok) {
            const taskData = await tasksResponse.json();
            const mappedTasks = (taskData.tasks || []).map(
              (t: {
                id: string;
                issueNumber?: number | null;
                title: string;
                status: TaskStatus;
              }) => ({
                id: t.id,
                ref: t.issueNumber ? `#${t.issueNumber}` : "",
                title: t.title,
                status: t.status,
              }),
            );
            setNextSprintTasks(mappedTasks);
          } else {
            console.error("Failed to fetch next sprint tasks");
            setNextSprintTasks([]);
          }
          shouldOpenTicketsOverlay = true;
        }
      } catch (err) {
        setNextSprintWelcomeOpen(false);
        setNextSprintTasks([]);
        setHandoffErrorMessage(
          "Failed to prepare the next sprint. Please check your connection and try again.",
        );
        setHandoffErrorOpen(true);
      } finally {
        setIsSprintHandoffSubmitting(false);
        setNextSprintWelcomeOpen(false);
        if (shouldOpenTicketsOverlay) {
          setGithubTicketsOverlayOpen(true);
        }
      }
    },
    [groupId, sprint],
  );

  const finalizeSprintHandoffFromTicketsOverlay = useCallback(async () => {
    if (!groupId || !sprint) return;
    setIsSprintHandoffSubmitting(true);

    const attemptTransition = async () => {
      const res = await fetch(`/api/groups/${groupId}/sprints/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSprintId: sprint.id,
        }),
      });
      return res;
    };

    try {
      let response = await attemptTransition();

      // If 404 (Sprint not found), try to sync and retry once
      if (response.status === 404) {
        console.log("Next sprint not found. Attempting a background sync...");

        const syncRes = await fetch(`/api/groups/${groupId}/sync`, {
          method: "POST",
        });

        if (syncRes.ok || syncRes.status === 409) {
          response = await attemptTransition();
        }
      }

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            `Next planning sprint not found after sync. Please check that the next iteration exists in your GitHub Projects and is in the 'Planning' status.
            If this project has ended, you may archive the group.`,
          );
        } else {
          throw new Error("Transition failed");
        }
      }

      setGithubTicketsOverlayOpen(false);
      router.refresh();
    } catch (err) {
      setGithubTicketsOverlayOpen(false);
      setHandoffErrorMessage(
        err instanceof Error ? err.message : "The sprint transition failed.",
      );
      setHandoffErrorOpen(true);
      setTransitionErrorOpen(true);
    } finally {
      setIsSprintHandoffSubmitting(false);
    }
  }, [groupId, sprint, router]);

  const isFinishDisabled = useMemo(() => {
    if (!sprint?.endDate) return true;

    const now = new Date();
    const end = new Date(sprint.endDate);
    const nowUtcDay = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const endUtcDay = Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate(),
    );
    const eligibleFromUtcDay = endUtcDay - 24 * 60 * 60 * 1000;

    return nowUtcDay < eligibleFromUtcDay || isFinishingSprint || isRefreshing;
  }, [sprint?.endDate, isFinishingSprint, isRefreshing]);

  const sprintTasks: SprintTaskRow[] = useMemo(
    () =>
      (metrics?.tasks || []).map((task) => ({
        id: task.id,
        ref: task.issueNumber ? `#${task.issueNumber}` : "",
        title: task.title,
        status: task.status,
        assignees: (task.assignees || []).map((assignee) => ({
          name: assignee.name,
          initials: getInitials(assignee.name),
          avatarUrl: assignee.avatarUrl,
        })),
        labels: task.labels || [],
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

  if (status === "error") {
    return (
      <CurrentSprintStatusWithHelp
        message={statusMessage ?? "Failed to load current sprint."}
      />
    );
  }

  if (status === "empty" || !sprint) {
    return (
      <CurrentSprintStatusWithHelp
        message={statusMessage ?? "No current sprint available."}
        iterationGuidanceVariant={iterationGuidanceVariant}
      />
    );
  }

  const todoCount = metrics?.taskBreakdown.todo ?? 0;
  const inProgressCount = metrics?.taskBreakdown.inProgress ?? 0;
  const doneCount = metrics?.taskBreakdown.done ?? 0;

  // Display the current sprint page with the fetched metrics
  return (
    <>
      <div className="min-h-full bg-brand-background">
        <PageContainer>
          <div className="space-y-lg">
            {refreshError ? (
              <p className="text-(length:--text-body-md) text-brand-todo">
                {refreshError}
              </p>
            ) : null}

            {/* Header: sprint title + help + refresh */}
            <div className="flex items-start justify-between gap-md border-b border-brand-dark/10 pb-lg">
              <div>
                <h1 className="text-(length:--text-h2) font-bold text-brand-dark">
                  {sprint.name}
                </h1>
                <p className="mt-xs text-(length:--text-body-xs) font-semibold uppercase tracking-[0.14em] text-brand-accent">
                  {formatSprintDate(sprint.startDate)} —{" "}
                  {formatSprintDate(sprint.endDate)} ·{" "}
                  {sprint.progress.remainingDays} days remaining
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-sm">
                <HelpOverlayTrigger
                  label="Help: current sprint and GitHub"
                  title="How this page maps to GitHub"
                  className="self-start pt-0.5"
                >
                  <div className="space-y-3 text-left">
                    <p>
                      The sprint name and dates match the{" "}
                      <span className="font-semibold">current iteration</span>{" "}
                      on your GitHub Project (via the project&apos;s iteration{" "}
                      field).
                    </p>
                    <p>
                      <span className="font-semibold">Sprint tasks</span> are
                      issues assigned to that iteration. Use{" "}
                      <span className="font-semibold">Refresh</span> after you
                      change issues or iterations on GitHub to pull the latest
                      data.
                    </p>
                    <p>
                      <span className="font-semibold">Sprint focus</span> is
                      stored for your team in this app; edit it here anytime.
                    </p>
                  </div>
                </HelpOverlayTrigger>
                <Button
                  variant="purple"
                  size="sm"
                  onClick={openFinishSprintConfirm}
                  disabled={isFinishDisabled}
                  aria-label={
                    isFinishDisabled
                      ? "Sprints can only be finished on the day before the end date or later."
                      : ""
                  }
                >
                  Finish Sprint
                </Button>
                <Button
                  variant="purple"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </div>
            {/* Sprint Focus */}
            <SprintFocus
              focus={sprint?.goal || ""}
              onUpdate={handleSaveSprintFocus}
              editable
            />

            {/* Sprint Timeline */}
            <SprintTimeline
              sprint={{
                startDate: sprint.startDate,
                endDate: sprint.endDate,
                progressPercent: sprint.progress.progressPercent,
                elapsedDays: sprint.progress.elapsedDays,
                remainingDays: sprint.progress.remainingDays,
                totalDays: sprint.progress.totalDays,
              }}
            />

            {/* Breakdown cards */}
            <BreakdownCard
              todoCount={todoCount}
              inProgressCount={inProgressCount}
              doneCount={doneCount}
            />
            {/* Tasks and Contributions */}
            <div className="grid min-w-0 items-stretch gap-lg lg:grid-cols-[1.4fr_1fr]">
              <div className="min-w-0 h-full">
                <SprintTaskSection tasks={sprintTasks} />
              </div>
              <div className="min-w-0 h-full">
                <ContributionCard
                  contributors={contributors}
                  groupId={groupId}
                  sprintId={sprint.id}
                />
              </div>
            </div>

            {/* Activity Timeline */}
            <ActivityTimeline items={timeline} />
          </div>
        </PageContainer>
      </div>

      <ConfirmOverlay
        open={finishConfirmOpen}
        title="Finish Sprint?"
        description={`Are you ready to wrap up ${sprint.name}? This will lead you to create a Sprint Review.`}
        onConfirm={confirmFinishSprint}
        onClose={() => setFinishConfirmOpen(false)}
        confirmLabel="Finish Sprint"
      />

      <SprintReviewPromptOverlay
        open={sprintReviewPromptOpen}
        onGenerateSprintReview={handleGenerateReview}
        onSkip={() => {
          setSprintReviewPromptOpen(false);
          setNextSprintWelcomeOpen(true);
        }}
        onClose={() => setSprintReviewPromptOpen(false)}
      />

      <SprintReviewPreviewOverlay
        open={sprintReviewPreviewOpen}
        reviewText={reviewText}
        sprintName={sprint?.name}
        groupName={groupName}
        isLoading={isGeneratingReview}
        onContinue={() => {
          setSprintReviewPreviewOpen(false);
          setNextSprintWelcomeOpen(true);
        }}
        onDismiss={() => setSprintReviewPreviewOpen(false)}
      />

      <SprintWelcomeOverlay
        open={nextSprintWelcomeOpen}
        sprintNumber={sprint.number + 1}
        onContinue={proceedFromWelcomeToGithubTickets}
        onClose={() => setNextSprintWelcomeOpen(false)}
        isContinuing={isSprintHandoffSubmitting}
      />

      <SprintGitHubTicketsOverlay
        open={githubTicketsOverlayOpen}
        tasks={nextSprintTasks}
        onContinue={finalizeSprintHandoffFromTicketsOverlay}
        onDismiss={() => setGithubTicketsOverlayOpen(false)}
        isContinuing={isSprintHandoffSubmitting}
      />
      <ConfirmOverlay
        open={handoffErrorOpen}
        title="Sprint Transition Failed"
        description={handoffErrorMessage}
        confirmLabel="Archive Group"
        cancelLabel="Back to Group Settings"
        onConfirm={() => {
          setHandoffErrorOpen(false);
          router.push("/join-create-switch-group");
        }}
        onClose={() => {
          setHandoffErrorOpen(false);
          router.push("/join-create-switch-group");
        }}
      />
    </>
  );
}
