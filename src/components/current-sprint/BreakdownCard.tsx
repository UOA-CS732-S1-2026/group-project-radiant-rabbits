import BreakdownTile from "./BreakdownTile";

type BreakdownCardProps = {
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
};

export default function BreakdownCard({
  todoCount,
  inProgressCount,
  doneCount,
}: BreakdownCardProps) {
  // Percentages are computed from the same total across all tiles so the three
  // cards read as one sprint snapshot rather than independent metrics.
  const total = todoCount + inProgressCount + doneCount;
  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-3">
      <BreakdownTile
        label="To Do"
        count={todoCount}
        total={total}
        dotColour="var(--color-status-todo-fg)"
      />
      <BreakdownTile
        label="In Progress"
        count={inProgressCount}
        total={total}
        dotColour="var(--color-status-in-progress-fg)"
      />
      <BreakdownTile
        label="Done"
        count={doneCount}
        total={total}
        dotColour="var(--color-status-completed-fg)"
      />
    </div>
  );
}
