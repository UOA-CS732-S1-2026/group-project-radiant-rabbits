import type { Sprint } from "@/components/shared/ProjectTimeline";
import ProjectTimeline from "@/components/shared/ProjectTimeline";

type Stat = {
  value: string;
  label: string;
  detail: string;
};

type DashboardProps = {
  stats?: Stat[];
  sprints?: Sprint[];
  currentSprint?: number;
  totalSprints?: number;
};

const defaultStats: Stat[] = [
  { value: "124", label: "Commits", detail: "+ 34 last sprint" },
  { value: "31", label: "Pull Requests", detail: "+ 6 last merged sprint" },
  { value: "54", label: "Issues Closed", detail: "+ 12 last sprint fixed" },
  { value: "8", label: "Active Contributors", detail: "Balanced workload" },
];

const defaultSprints: Sprint[] = [
  { name: "Sprint 1", velocity: 5 },
  { name: "Sprint 2", velocity: 12 },
  { name: "Sprint 3", velocity: 18 },
  { name: "Sprint 4", velocity: 28 },
  { name: "Sprint 5", velocity: 38 },
  { name: "Sprint 6", velocity: 45 },
  { name: "Sprint 7", velocity: 50 },
  { name: "Sprint 8", velocity: 55 },
];

export default function Dashboard({
  stats = defaultStats,
  sprints = defaultSprints,
  currentSprint = 3,
  totalSprints = 6,
}: DashboardProps) {
  return (
    <div className="flex flex-col gap-lg">
      {/* Project Overview */}
      <div className="rounded-2xl bg-brand-surface p-lg shadow-md">
        <h2 className="mb-md text-h3 font-bold text-brand-dark">
          Project Overview
        </h2>
        <div className="grid grid-cols-2 gap-md md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-brand-dark/10 p-md"
            >
              <p className="text-h2 font-bold text-brand-dark">
                {stat.value}{" "}
                <span className="text-body-sm font-medium">{stat.label}</span>
              </p>
              <p className="mt-xs text-body-xs text-brand-dark/50">
                {stat.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Project Timeline & Sprint Velocity */}
      <ProjectTimeline
        sprints={sprints}
        currentSprint={currentSprint}
        totalSprints={totalSprints}
      />
    </div>
  );
}
