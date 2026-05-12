type BreakdownTileProps = {
  label: string;
  count: number;
  total: number;
  dotColour: string;
};

// Component for individual tiles in the breakdown card, showing count and percentage
export default function BreakdownTile({
  label,
  count,
  total,
  dotColour,
}: BreakdownTileProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-brand-dark/10 bg-brand-surface p-md">
      <div className="flex items-center gap-xs">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: dotColour }}
        />
        <span className="text-(length:--text-body-xs) font-semibold uppercase tracking-[0.14em] text-brand-dark/55">
          {label}
        </span>
      </div>
      <div className="mt-md flex items-baseline gap-xs">
        <span className="text-(length:--text-h1) font-bold leading-none text-brand-dark">
          {count}
        </span>
        <span className="text-(length:--text-body-sm) text-brand-dark/50">
          / {total}
        </span>
      </div>
      <div className="mt-md h-1.5 w-full overflow-hidden rounded-full bg-brand-dark/5">
        <div
          className="h-full rounded-full"
          style={{ width: `${percentage}%`, backgroundColor: dotColour }}
        />
      </div>
      <p className="mt-xs text-(length:--text-body-xs) text-brand-dark/55">
        {percentage}% of sprint
      </p>
    </div>
  );
}
