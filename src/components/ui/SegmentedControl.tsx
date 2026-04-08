"use client";

export type SegmentedControlOption = { id: string; label: string };

export type SegmentedControlSize = "sm" | "lg";

type SegmentedControlProps = {
  options: readonly SegmentedControlOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  /** `lg` is the default comfortable tabs; `sm` is denser. */
  size?: SegmentedControlSize;
};

const tabClasses: Record<
  SegmentedControlSize,
  { active: string; inactive: string; shell: string }
> = {
  lg: {
    shell:
      "flex w-full max-w-full flex-wrap items-center justify-center gap-0.5 rounded-xl bg-slate-100/90 p-1 sm:w-fit sm:flex-nowrap",
    active:
      "min-h-9 shrink-0 rounded-lg bg-brand-surface px-3 py-1.5 text-center text-body-sm font-semibold text-brand-dark shadow-sm sm:min-h-10 sm:px-3.5 sm:py-2 sm:text-body-md",
    inactive:
      "min-h-9 shrink-0 rounded-lg px-3 py-1.5 text-center text-body-sm font-medium text-brand-dark/60 transition hover:bg-brand-surface/60 hover:text-brand-dark/85 sm:min-h-10 sm:px-3.5 sm:py-2 sm:text-body-md",
  },
  sm: {
    shell:
      "flex w-full max-w-full flex-wrap items-center justify-center gap-0.5 rounded-lg bg-slate-100/90 p-1 sm:w-fit sm:flex-nowrap",
    active:
      "min-h-8 shrink-0 rounded-md bg-brand-surface px-2.5 py-1.5 text-center text-body-sm font-semibold text-brand-dark shadow-sm sm:min-h-9 sm:px-3 sm:py-2 sm:text-body-md",
    inactive:
      "min-h-8 shrink-0 rounded-md px-2.5 py-1.5 text-center text-body-sm font-medium text-brand-dark/60 transition hover:bg-brand-surface/60 hover:text-brand-dark/85 sm:min-h-9 sm:px-3 sm:py-2 sm:text-body-md",
  },
};

export default function SegmentedControl({
  options,
  value,
  onChange,
  className = "",
  size = "lg",
}: SegmentedControlProps) {
  const styles = tabClasses[size];

  return (
    <div
      role="tablist"
      aria-label="Group actions"
      className={`${styles.shell} ${className}`.trim()}
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
            className={active ? styles.active : styles.inactive}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
