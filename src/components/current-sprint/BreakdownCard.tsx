import BreakdownTile from "./BreakdownTile";

type BreakdownCardProps = {
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
};

// Component for breakdown cards that shows the task counts by status
export default function BreakdownCard({
  todoCount,
  inProgressCount,
  doneCount,
}: BreakdownCardProps) {
  const total = todoCount + inProgressCount + doneCount;
  return (
    <div className="grid grid-cols-1 gap-md md:grid-cold-3">
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
        dotColour="var(--color-status-inprogress-fg)"
      />
      <BreakdownTile
        label="Done"
        count={doneCount}
        total={total}
        dotColour="var(--color-status-done-fg)"
      />
    </div>
  );
}
