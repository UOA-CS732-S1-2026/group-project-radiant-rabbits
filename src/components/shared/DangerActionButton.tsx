type DangerActionButtonProps = {
  children: React.ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
};

export default function DangerActionButton({
  children,
  type = "button",
  onClick,
  className = "",
}: DangerActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`shrink-0 rounded-lg bg-status-todo-fg px-md py-sm text-body-sm font-medium text-brand-surface hover:bg-status-todo-fg/90 ${className}`.trim()}
    >
      {children}
    </button>
  );
}
