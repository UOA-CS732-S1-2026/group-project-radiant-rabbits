import { useState } from "react";
import Avatar from "@/components/shared/Avatar";
import BorderedPanel from "@/components/shared/BorderedPanel";
import FilterChip from "./FilterChip";
import StatusBadge from "./StatusBadge";

type TaskStatus = "UNASSIGNED" | "TODO" | "IN_PROGRESS" | "DONE";

type Assignee = {
  name: string;
  initials: string;
  avatarUrl: string | null;
};

type Task = {
  id: string;
  ref: string;
  title: string;
  status: TaskStatus;
  labels?: string[];
  assignees?: Assignee[];
};

type SprintTaskSectionProps = {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
};

// Component to display a section of tasks grouped by status
export default function SprintTaskSection({ tasks }: SprintTaskSectionProps) {
  const [filter, setFilter] = useState<
    "all" | "todo" | "in_progress" | "done" | "unassigned"
  >("all");

  const isUnassigned = (t: Task) => !t.assignees || t.assignees.length === 0;
  const getDisplayStatus = (t: Task): TaskStatus =>
    isUnassigned(t) ? "UNASSIGNED" : t.status;

  const todoCount = tasks.filter(
    (t) => t.status === "TODO" || isUnassigned(t),
  ).length;
  const inProgressCount = tasks.filter(
    (t) => t.status === "IN_PROGRESS",
  ).length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;
  const unassignedCount = tasks.filter(isUnassigned).length;

  const filteredTasks = tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "todo") return t.status === "TODO" || isUnassigned(t);
    if (filter === "in_progress") return t.status === "IN_PROGRESS";
    if (filter === "done") return t.status === "DONE";
    if (filter === "unassigned") return isUnassigned(t);
    return true;
  });

  return (
    <BorderedPanel className="p-md">
      <div className="mb-md flex flex-col items-start gap-sm">
        <h4 className="text-(length:--text-body-lg) font-semibold text-brand-dark">
          Sprint Tasks
        </h4>
        <div className="flex flex-wrap gap-1 rounded-md bg-brand-dark/5 p-xs">
          <FilterChip
            label={`All (${tasks.length})`}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterChip
            label={`Unassigned (${unassignedCount})`}
            active={filter === "unassigned"}
            onClick={() => setFilter("unassigned")}
          />
          <FilterChip
            label={`To Do (${todoCount})`}
            active={filter === "todo"}
            onClick={() => setFilter("todo")}
          />
          <FilterChip
            label={`In Progress (${inProgressCount})`}
            active={filter === "in_progress"}
            onClick={() => setFilter("in_progress")}
          />
          <FilterChip
            label={`Done (${doneCount})`}
            active={filter === "done"}
            onClick={() => setFilter("done")}
          />
        </div>
      </div>

      {/* Task list */}
      <div className="h-80 overflow-y-auto pr-xs">
        {filteredTasks.length === 0 ? (
          <p className="text-(length:--text-body-md) text-brand-dark/60">
            No tasks in this category. Assign tickets to this iteration in your
            GitHub Project to see them here.
          </p>
        ) : (
          <div className="space-y-xs">
            {filteredTasks.map((task, index) => {
              return (
                <div
                  key={task.id}
                  className={`flex w-full min-w-0 items-center gap-md px-md py-md text-left-transition ${
                    index === 0 ? "" : "border-t border-brand-dark/10 pt-md"
                  }`}
                >
                  <span className="shrink-0 text-(length:--text-body-xs) font-semibold text-brand-dark/60">
                    {task.ref || `#${task.id}`}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-(length:--text-body-sm) font-medium text-brand-dark"
                      style={{
                        textDecoration:
                          task.status === "DONE" ? "line-through" : "none",
                        opacity: task.status === "DONE" ? 0.6 : 1,
                      }}
                    >
                      {task.title}
                    </div>
                    {task.labels && task.labels.length > 0 && (
                      <div className="mt-xs flex flex-wrap gap-xs">
                        {task.labels.map((label) => (
                          <span
                            key={label}
                            className="inline-block rounded-sm bg-brand-dark/5 px-xs py-0.5 text-(length:--text-body-xs) text-brand-dark/70"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="ml-auto flex items-center gap-sm">
                    <StatusBadge status={getDisplayStatus(task)} />
                    {task.assignees && task.assignees.length > 0 ? (
                      <Avatar
                        name={task.assignees[0].name}
                        initials={task.assignees[0].initials}
                        avatarUrl={task.assignees[0].avatarUrl}
                        size={24}
                        className="shrink-0"
                      />
                    ) : (
                      <Avatar
                        name="Unassigned"
                        initials="?"
                        avatarUrl={null}
                        size={24}
                        className="shrink-0"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BorderedPanel>
  );
}
