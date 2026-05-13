type DangerActionButtonProps = {
  children: React.ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
  "aria-label"?: string;
};

export default function DangerActionButton({
  children,
  type = "button",
  onClick,
  className = "",
  "aria-label": ariaLabel,
}: DangerActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`shrink-0 rounded-lg bg-status-todo-fg px-md py-sm text-body-sm font-medium text-brand-surface hover:bg-status-todo-fg/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-todo-fg ${className}`.trim()}
    >
      {children}
    </button>
  );
}
