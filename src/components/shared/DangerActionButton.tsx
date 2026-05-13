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
      className={`inline-flex min-h-9 items-center justify-center rounded-xl px-sm py-1.5 text-(length:--text-body-sm) sm:text-(length:--text-body-md) font-medium text-white transition bg-status-todo-fg hover:bg-status-todo-fg/90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-todo-fg ${className}`.trim()}
    >
      {children}
    </button>
  );
}
