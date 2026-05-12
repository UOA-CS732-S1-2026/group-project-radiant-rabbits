type FilterChipProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

// Component for a filter chip
export default function FilterChip({
  label,
  active = false,
  onClick,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "rounded-md bg-brand-surface px-sm py-xs text-(length:--text-body-xs) font-medium text-brand-dark shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary"
          : "rounded-md px-sm py-xs text-(length:--text-body-xs) text-brand-dark/70 transition hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary"
      }
    >
      {label}
    </button>
  );
}
