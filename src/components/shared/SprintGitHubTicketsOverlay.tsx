"use client";

/**
 * Second step after next-sprint welcome: shows `metrics.tasks` in the same row layout
 * as Current Sprint → Sprint Tasks, or empty-state copy pointing users to GitHub.
 */
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/shared/Button";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type SprintGitHubTicketRow = {
  id: string;
  ref: string;
  title: string;
  status: TaskStatus;
};

export type SprintGitHubTicketsOverlayProps = {
  open: boolean;
  tasks: SprintGitHubTicketRow[];
  onContinue: () => void;
  onDismiss: () => void;
  isContinuing?: boolean;
};

/** Same pill styles as the Current Sprint page task list. */
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
      className={`inline-flex min-w-16 shrink-0 justify-center rounded-lg px-sm py-xs text-body-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default function SprintGitHubTicketsOverlay({
  open,
  tasks,
  onContinue,
  onDismiss,
  isContinuing = false,
}: SprintGitHubTicketsOverlayProps) {
  const headingId = useId();
  const hasTickets = tasks.length > 0;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isContinuing) onDismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onDismiss, isContinuing]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const overlay =
    open && typeof document !== "undefined"
      ? createPortal(
          // z above welcome (100) and sprint review preview (101)
          <div className="fixed inset-0 z-[102]">
            <button
              type="button"
              aria-label="Close dialog"
              className="absolute inset-0 bg-brand-dark/60 backdrop-blur-[1px] transition-opacity disabled:cursor-not-allowed"
              onClick={() => {
                if (!isContinuing) onDismiss();
              }}
              disabled={isContinuing}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 sm:p-6">
              <div className="pointer-events-auto w-full max-w-[min(92vw,40rem)] shrink-0">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={headingId}
                  className="relative flex max-h-[min(85vh,36rem)] w-full min-w-0 flex-col overflow-hidden rounded-2xl bg-[#F1F5F9] text-left shadow-xl ring-1 ring-brand-dark/10"
                >
                  <div className="shrink-0 border-b border-brand-dark/10 px-4 pb-3 pt-4 text-center sm:px-6 sm:pt-5">
                    <h2
                      id={headingId}
                      className="text-h3 font-bold leading-snug text-brand-dark"
                    >
                      GitHub tickets for this sprint
                    </h2>
                    <p className="mx-auto mt-2 max-w-[32rem] text-body-md leading-relaxed text-brand-dark/85">
                      {hasTickets
                        ? "These issues are synced from your GitHub project. You can edit them anytime on GitHub."
                        : "We are not seeing any issues on this sprint yet. Add issues in GitHub, assign them to your project (and iteration field if you use one), then use Refresh on the current sprint page."}
                    </p>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                    {hasTickets ? (
                      <ul
                        aria-label="Sprint issues from GitHub"
                        className="list-none space-y-md p-0"
                      >
                        {tasks.map((task) => (
                          <li
                            key={task.id}
                            className="grid grid-cols-[5rem_1fr_6rem] items-center border-b border-brand-dark/10 pb-sm text-body-md"
                          >
                            <span className="text-brand-dark/60">
                              {task.ref || "—"}
                            </span>
                            <span className="min-w-0 text-brand-dark/70">
                              {task.title}
                            </span>
                            <div className="flex justify-end">
                              <StatusBadge status={task.status} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-xl border border-dashed border-brand-dark/20 bg-brand-surface/80 px-4 py-6 text-center text-body-md leading-relaxed text-brand-dark/75">
                        No tickets yet — open your repo on GitHub, create or
                        move issues onto the linked project board, then refresh
                        here.
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 border-t border-brand-dark/10 bg-[#E8EDF3] px-4 py-4 text-center sm:px-6">
                    <Button
                      type="button"
                      variant="purple"
                      size="sm"
                      className="w-full min-w-[8rem] max-w-[20rem] sm:w-auto"
                      onClick={onContinue}
                      disabled={isContinuing}
                    >
                      {isContinuing ? "Working…" : "Continue to current sprint"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return overlay;
}
