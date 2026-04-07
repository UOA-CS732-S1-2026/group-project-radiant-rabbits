type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

export default function Button({
  children,
  variant = "primary",
  type = "button",
  onClick,
  disabled,
  className = "",
}: ButtonProps) {
  const base =
    "rounded-xl px-md py-sm text-body-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-accent disabled:opacity-60 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-brand-accent text-white hover:opacity-90"
      : "bg-white text-brand-dark border border-brand-accent hover:bg-brand-background";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </button>
  );
}
