"use client";

export type SegmentedControlOption = { id: string; label: string };

type SegmentedControlProps = {
  options: readonly SegmentedControlOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

export default function SegmentedControl({
  options,
  value,
  onChange,
  className = "",
}: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      aria-label="Group actions"
      className={`flex w-fit max-w-full items-center gap-px rounded-lg bg-slate-100/90 px-1 py-0.5 ${className}`}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={
              active
                ? "shrink-0 rounded-md bg-brand-surface px-1.5 py-1.5 text-center text-body-xs font-semibold text-brand-dark shadow-sm sm:px-2 sm:py-1.5 sm:text-body-sm"
                : "shrink-0 rounded-md px-1.5 py-xs text-center text-body-xs font-medium text-brand-dark/55 transition hover:text-brand-dark/85 sm:px-2 sm:py-xs sm:text-body-sm"
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
