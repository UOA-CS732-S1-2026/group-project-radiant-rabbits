"use client";

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
import SprintFocus from "@/components/current-sprint/SprintFocus";
import SprintTaskSection from "@/components/current-sprint/SprintTaskSection";
import SprintTimeline from "@/components/current-sprint/SprintTimeline";
import Button from "@/components/shared/Button";
import ConfirmOverlay from "@/components/shared/ConfirmOverlay";
import PageContainer from "@/components/shared/PageContainer";
import SprintGitHubTicketsOverlay from "@/components/shared/SprintGitHubTicketsOverlay";
import SprintReviewPreviewOverlay from "@/components/shared/SprintReviewPreviewOverlay";
import SprintReviewPromptOverlay from "@/components/shared/SprintReviewPromptOverlay";
import SprintWelcomeOverlay from "@/components/shared/SprintWelcomeOverlay";
import { getInitials } from "@/lib/formatters";

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
  groupId?: string;
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

// Helper function to compute the status message for the sprint
function StatusBlock({ message }: { message: string }) {
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <p className="text-body-md text-brand-dark/70">{message}</p>
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

      try {
        setIsSprintHandoffSubmitting(true);

        // Fetch all sprints for the group
        const sprintsResponse = await fetch(`/api/groups/${groupId}/sprints`);
        if (!sprintsResponse.ok) {
          throw new Error("Failed to load sprints");
        }

        const sprintList = await sprintsResponse.json();
        const sprints = Array.isArray(sprintList) ? sprintList : [];

        // Find the next sprint by name pattern
        const nextSprintNumber = sprint.number + 1;
        const targetName = `sprint${nextSprintNumber}`;

        const nextSprint = sprints.find(
          (s: { name?: string; _id?: string }) => {
            if (!s.name) return false;

            const normalizedDbName = s.name.replace(/\s/g, "").toLowerCase();

            console.log(
              `Checking normalized "${normalizedDbName}" against target "${targetName}"`,
            );

            return normalizedDbName === targetName;
          },
        );

        if (!nextSprint || !nextSprint._id) {
          console.warn(`Next sprint "${nextSprintNumber}" not found`);
          setNextSprintTasks([]);
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
        }
      } catch (err) {
        console.error("Sprint handoff error:", err);
        setNextSprintTasks([]);
      } finally {
        setIsSprintHandoffSubmitting(false);
        setNextSprintWelcomeOpen(false);
        setGithubTicketsOverlayOpen(true);
      }
    },
    [groupId, sprint],
  );

  const finalizeSprintHandoffFromTicketsOverlay = useCallback(async () => {
    if (!groupId || !sprint) return;
    setIsSprintHandoffSubmitting(true);
    try {
      const response = await fetch(
        `/api/groups/${groupId}/sprints/transition`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentSprintId: sprint.id,
            nextSprintNumber: sprint.number + 1,
          }),
        },
      );

      if (!response.ok) throw new Error("Transition failed");

      setGithubTicketsOverlayOpen(false);
      pendingSprintFocusRef.current = "";

      router.refresh();
    } catch (err) {
      console.error("Transition failed. Please refresh the page.", err);
    } finally {
      setIsSprintHandoffSubmitting(false);
    }
  }, [groupId, sprint, router]);

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
              <p className="text-body-md text-brand-todo">{refreshError}</p>
            ) : null}

            {/* Header: sprint title + refresh button */}
            <div className="flex items-start justify-between gap-md border-b border-brand-dark/10 pb-lg">
              <div>
                <h1 className="text-h2 font-bold text-brand-dark">
                  {sprint.name}
                </h1>
                <p className="mt-xs text-body-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
                  {formatShortDate(sprint.startDate)} —{" "}
                  {formatShortDate(sprint.endDate)} ·{" "}
                  {sprint.progress.remainingDays} days remaining
                </p>
              </div>
              <div className="flex gap-md">
                <Button
                  variant="purple"
                  size="sm"
                  onClick={openFinishSprintConfirm}
                  disabled={isFinishingSprint}
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
            <div className="grid min-w-0 gap-lg lg:grid-cols-[1.4fr_1fr]">
              <div className="min-w-0">
                <SprintTaskSection tasks={sprintTasks} />
              </div>
              <div className="min-w-0">
                <ContributionCard contributors={contributors} />
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
    </>
  );
}
