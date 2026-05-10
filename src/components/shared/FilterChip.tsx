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
      className={
        active
          ? "rounded-md bg-brand-surface px-sm py-xs text-(length:--text-body-xs) font-medium text-brand-dark shadow-sm"
          : "rounded-md px-sm py-xs text-(length:--text-body-xs) text-brand-dark/70 transition hover:text-brand-dark"
      }
    >
      {label}
    </button>
  );
}
