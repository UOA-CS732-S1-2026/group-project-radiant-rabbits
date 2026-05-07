import Card from "@/components/shared/Card";

type SprintForDashboard = {
  name: string;
  velocity: number;
  isCurrent: boolean;
};

type SprintVelocityCardProps = {
  sprints?: SprintForDashboard[];
  // null before first sync, false if no iteration field, true if set up.
  iterationFieldConfigured?: boolean | null;
  // ISO date of the next iteration's start. Only set when iterations exist
  // but none cover today.
  nextSprintStart?: string | null;
};

type MiniSeriesPoint = {
  label: string;
  value: number;
  projected?: boolean;
  active?: boolean;
};

// Helper to format dates for the "next iteration starts on..." hint
function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// SVG line/area chart for sprint velocity. Stretches to fill the parent box.
function MiniVelocityChart({ data }: { data: MiniSeriesPoint[] }) {
  const w = 760;
  const h = 240;
  const pad = { l: 26, r: 40, t: 12, b: 32 };
  const safeData = data.length > 0 ? data : [{ label: "S1", value: 0 }];
  const max = Math.max(...safeData.map((point) => point.value), 10);
  const xs = (index: number) =>
    pad.l + (index * (w - pad.l - pad.r)) / Math.max(1, safeData.length - 1);
  const ys = (value: number) => pad.t + (1 - value / max) * (h - pad.t - pad.b);
  const points = safeData.map((point, index) => ({
    x: xs(index),
    y: ys(point.value),
  }));
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  const area = `${path} L${points[points.length - 1].x},${h - pad.b} L${points[0].x},${h - pad.b} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-full w-full flex-1"
      role="img"
      aria-label="Sprint velocity chart"
    >
      <defs>
        <linearGradient
          id="dashboard-velocity-fill"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor="var(--color-brand-accent)"
            stopOpacity="0.20"
          />
          <stop
            offset="100%"
            stopColor="var(--color-brand-accent)"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      {[0, max / 2, max].map((tick) => {
        const y = ys(tick);
        return (
          <g key={String(tick)}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={y}
              y2={y}
              stroke="var(--color-brand-dark)"
              strokeOpacity="0.08"
            />
            <text
              x={pad.l - 8}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-brand-dark)"
              fillOpacity="0.45"
            >
              {Math.round(tick)}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#dashboard-velocity-fill)" />
      <path
        d={path}
        fill="none"
        stroke="var(--color-brand-accent)"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((point, index) => (
        <circle
          key={safeData[index].label}
          cx={point.x}
          cy={point.y}
          r="3.25"
          fill="var(--brand-surface)"
          stroke="var(--color-brand-accent)"
          strokeWidth="1.75"
        />
      ))}
      {safeData.map((point, index) => (
        <text
          key={point.label}
          x={points[index].x}
          y={h - 7}
          textAnchor="middle"
          fontSize="10.5"
          fill="var(--color-brand-dark)"
          fillOpacity="0.58"
        >
          {point.label}
        </text>
      ))}
    </svg>
  );
}

// Component for the sprint velocity card (chart + heading + empty states)
export default function SprintVelocityCard({
  sprints,
  iterationFieldConfigured,
  nextSprintStart,
}: SprintVelocityCardProps) {
  const velocitySeries: MiniSeriesPoint[] =
    sprints?.map((sprint, index) => ({
      label: sprint.name,
      value: sprint.velocity,
      active: sprint.isCurrent,
      projected: index === (sprints.length ?? 0) - 1 && !sprint.isCurrent,
    })) ?? [];

  return (
    <Card className="flex flex-col p-md">
      <div className="mb-md flex items-start justify-between gap-md">
        <div>
          <p className="mb-xs text-body-xs font-semibold uppercase tracking-[0.14em] text-brand-dark/45">
            Sprint velocity
          </p>
          <h3 className="text-body-lg font-semibold text-brand-dark">
            Smaller sprint view
          </h3>
          <p className="text-body-xs text-brand-dark/50">
            Total number of issues closed per sprint
          </p>
        </div>
        <span className="rounded-md bg-brand-accent/10 px-sm py-xs text-body-xs font-medium text-brand-accent">
          {sprints?.length ?? 0} iterations
        </span>
      </div>
      {velocitySeries.length > 0 ? (
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-brand-dark/10 bg-brand-surface p-md">
          <div className="flex h-68 items-stretch">
            <MiniVelocityChart data={velocitySeries} />
          </div>
          {sprints && !sprints.some((s) => s.isCurrent) && nextSprintStart ? (
            <p className="mt-md text-body-sm text-brand-dark/60">
              No iteration is active right now. The next iteration starts on{" "}
              <span className="font-semibold text-brand-dark">
                {formatDateLabel(nextSprintStart)}
              </span>
              .
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-brand-dark/10 bg-brand-surface p-md">
          {iterationFieldConfigured === false ? (
            <p className="text-body-sm text-brand-dark/60">
              This repo&apos;s GitHub Project doesn&apos;t have an iteration
              field yet. Once you{" "}
              <a
                href="https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-iterations"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-accent underline"
              >
                add an iteration field
              </a>{" "}
              to your Project (or create a Project for this repo) and assign
              tickets to it, sprint metrics will appear here on the next sync.
            </p>
          ) : (
            <p className="text-body-sm text-brand-dark/60">
              Your iteration field is set up but has no iterations yet. Create
              one in your GitHub Project, assign tickets to it, then refresh.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
