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
  /** Accessible label for the tablist — describe what the tabs control, e.g. "View options". */
  "aria-label": string;
};

const tabClasses: Record<
  SegmentedControlSize,
  { active: string; inactive: string; shell: string }
> = {
  lg: {
    shell:
      "flex w-full max-w-full flex-wrap items-center justify-center gap-xs rounded-[length:var(--radius-xl)] p-1 sm:w-fit sm:flex-nowrap",
    active:
      "min-h-9 shrink-0 rounded-[length:var(--radius-lg)] bg-brand-surface px-3 py-1.5 text-center text-(length:--text-body-sm) font-semibold text-brand-dark shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary sm:min-h-10 sm:px-3.5 sm:py-2",
    inactive:
      "min-h-9 shrink-0 rounded-[length:var(--radius-lg)] px-3 py-1.5 text-center text-(length:--text-body-sm) font-medium text-brand-dark/60 transition hover:bg-brand-surface/60 hover:text-brand-dark/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary sm:min-h-10 sm:px-3.5 sm:py-2",
  },
  sm: {
    shell:
      "flex w-full max-w-full flex-wrap items-center justify-center gap-xs rounded-[length:var(--radius-lg)] p-1 sm:w-fit sm:flex-nowrap",
    active:
      "min-h-8 shrink-0 rounded-[length:var(--radius-md)] bg-brand-surface px-2.5 py-1.5 text-center text-(length:--text-body-sm) font-semibold text-brand-dark shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary sm:min-h-9 sm:px-3 sm:py-2",
    inactive:
      "min-h-8 shrink-0 rounded-[length:var(--radius-md)] px-2.5 py-1.5 text-center text-(length:--text-body-sm) font-medium text-brand-dark/60 transition hover:bg-brand-surface/60 hover:text-brand-dark/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary sm:min-h-9 sm:px-3 sm:py-2",
  },
};

export default function SegmentedControl({
  options,
  value,
  onChange,
  className = "",
  size = "lg",
  "aria-label": ariaLabel,
}: SegmentedControlProps) {
  const styles = tabClasses[size];
  // Background color is a token-driven inline style because this component is
  // reused on both light and full-page group-change surfaces.
  const shellStyle = { backgroundColor: "var(--color-segmented-bg)" };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={shellStyle}
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
