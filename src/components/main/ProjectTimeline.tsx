export type Sprint = {
  name: string;
  velocity: number;
};

type ProjectTimelineProps = {
  sprints: Sprint[];
  currentSprint: number;
  totalSprints: number;
};

export default function ProjectTimeline({
  sprints,
  currentSprint,
  totalSprints,
}: ProjectTimelineProps) {
  const sprintLabels = Array.from(
    { length: totalSprints },
    (_, i) => `Sprint ${i + 1}`,
  );

  // Font size shrinks as sprint count grows
  const labelSize =
    totalSprints <= 6
      ? "text-body-xs"
      : totalSprints <= 10
        ? "text-[0.65rem]"
        : "text-[0.55rem]";

  // Progress bar fills to the centre of the current sprint's column
  const progressPercent = Math.min(
    ((currentSprint - 0.5) / totalSprints) * 100,
    100,
  );

  // Create the velocity chart
  const maxVelocity = Math.max(...sprints.map((s) => s.velocity));
  const yTicks = getYTicks(maxVelocity);
  const yMax = yTicks[yTicks.length - 1];

  // Scale SVG width with sprint count so labels don't overlap
  const baseWidth = 400;
  const chartWidth = Math.max(baseWidth, sprints.length * 60);
  const chartHeight = 160;
  const paddingX = 30;
  const paddingY = 20;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const points = sprints.map((s, i) => ({
    x:
      paddingX +
      (sprints.length === 1
        ? usableWidth / 2
        : (i / (sprints.length - 1)) * usableWidth),
    y: paddingY + usableHeight - (s.velocity / yMax) * usableHeight,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${paddingY + usableHeight} L${points[0].x},${paddingY + usableHeight} Z`;

  // Chart label font size
  const chartFontSize =
    sprints.length <= 6 ? 9 : sprints.length <= 10 ? 7.5 : 6;

  return (
    <div className="flex flex-col gap-md">
      {/* Project Timeline */}
      <h3 className="text-body-lg font-semibold text-brand-dark">
        Project Timeline
      </h3>
      <div className="rounded-2xl bg-brand-surface p-lg shadow-md">
        <div>
          {/* Sprint labels — each sits in a column equal to 1/totalSprints */}
          <div className="mb-xs flex">
            {sprintLabels.map((label, i) => (
              <span
                key={label}
                className={`flex-1 text-center ${labelSize} ${
                  i < currentSprint
                    ? "font-medium text-brand-dark"
                    : "text-brand-dark/40"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-brand-accent/20">
            <div
              className="h-full rounded-full bg-brand-accent transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sprint Velocity */}
      <div className="mb-lg rounded-2xl bg-brand-surface p-lg shadow-md">
        <h3 className="mb-md text-body-lg font-semibold text-brand-dark">
          Sprint Velocity
        </h3>
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full"
            style={{
              minWidth:
                sprints.length > 8 ? `${sprints.length * 50}px` : undefined,
            }}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-labelledby="velocity-chart-title"
          >
            <title id="velocity-chart-title">Sprint velocity chart</title>

            {/* Y-axis gridlines and labels */}
            {yTicks.map((tick) => {
              const y = paddingY + usableHeight - (tick / yMax) * usableHeight;
              return (
                <g key={tick}>
                  <line
                    x1={paddingX}
                    x2={paddingX + usableWidth}
                    y1={y}
                    y2={y}
                    stroke="#091636"
                    strokeOpacity={0.08}
                    strokeWidth={0.5}
                  />
                  <text
                    x={paddingX - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-brand-dark/40"
                    fontSize={chartFontSize}
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            <path d={areaPath} fill="#7bbcfe" fillOpacity={0.15} />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#7bbcfe"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((p, i) => (
              <circle
                key={sprints[i].name}
                cx={p.x}
                cy={p.y}
                r={3}
                fill="#ffffff"
                stroke="#7bbcfe"
                strokeWidth={1.5}
              />
            ))}

            {/* X-axis labels */}
            {sprints.map((s, i) => (
              <text
                key={s.name}
                x={points[i].x}
                y={chartHeight - 2}
                textAnchor="middle"
                className="fill-brand-dark/50"
                fontSize={chartFontSize}
              >
                {s.name}
              </text>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

function getYTicks(max: number): number[] {
  const step = Math.ceil(max / 4 / 5) * 5;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step; v += step) {
    ticks.push(v);
    if (v >= max) break;
  }
  return ticks;
}
