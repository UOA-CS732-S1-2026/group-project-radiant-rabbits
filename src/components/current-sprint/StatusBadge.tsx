type TaskStatus = "UNASSIGNED" | "TODO" | "IN_PROGRESS" | "DONE";

type StatusBadgeProps = {
  status: TaskStatus;
};

// Component to display a colored badge based on the task status
export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<TaskStatus, { backgroundColor: string; color: string }> =
    {
      UNASSIGNED: {
        backgroundColor: "var(--color-status-unassigned-bg)",
        color: "var(--color-status-unassigned-fg)",
      },
      TODO: {
        backgroundColor: "var(--color-status-todo-bg)",
        color: "var(--color-status-todo-fg)",
      },
      IN_PROGRESS: {
        backgroundColor: "var(--color-status-in-progress-bg)",
        color: "var(--color-status-in-progress-fg)",
      },
      DONE: {
        backgroundColor: "var(--color-status-completed-bg)",
        color: "var(--color-status-completed-fg)",
      },
    };
  const labels: Record<TaskStatus, string> = {
    UNASSIGNED: "Unassigned",
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Done",
  };
  return (
    <span
      className="inline-flex min-w-16 justify-center rounded-md px-sm py-xs text-body-xs font-semibold"
      style={styles[status]}
    >
      {labels[status]}
    </span>
  );
}
