type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

type StatusBadgeProps = {
  status: TaskStatus;
};

// Component to display a colored badge based on the task status
export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<TaskStatus, { backgroundColor: string; color: string }> =
    {
      TODO: {
        backgroundColor: "var(--color-status-todo-bg)",
        color: "var(--color-status-todo-fg",
      },
      IN_PROGRESS: {
        backgroundColor: "var(--color-status-inprogress-bg)",
        color: "var(--color-status-inprogress-fg)",
      },
      DONE: {
        backgroundColor: "var(--color-status-done-bg)",
        color: "var(--color-status-done-fg)",
      },
    };
  const labels: Record<TaskStatus, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Closed",
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
