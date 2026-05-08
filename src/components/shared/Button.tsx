import Link from "next/link";

export type ButtonSize = "sm" | "lg";

type ButtonProps = {
  children: React.ReactNode;
  variant?: "purple" | "white" | "grey" | "blue-help";
  shape?: "default" | "pill";
  size?: ButtonSize;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  href?: string;
  "aria-label"?: string;
};

export default function Button({
  children,
  variant = "purple",
  shape = "default",
  size = "lg",
  type = "button",
  onClick,
  disabled,
  className = "",
  href,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const hasExplicitTextSize =
    /text-body-(?:xs|sm|md|lg)/.test(className) ||
    /\btext-(?:xs|sm|md|lg|xl|2xl|3xl)\b/.test(className) ||
    /text-\[/.test(className);

  const defaultTextSize = hasExplicitTextSize
    ? ""
    : size === "lg"
      ? "text-body-sm sm:text-body-md"
      : "text-body-sm sm:text-body-md";

  const layoutDefault =
    size === "lg"
      ? `inline-flex items-center justify-center rounded-xl px-3 py-1.5 font-medium ${defaultTextSize}`.trim()
      : `inline-flex min-h-9 items-center justify-center rounded-xl px-sm py-1.5 font-medium ${defaultTextSize}`.trim();

  const layoutPill =
    size === "lg"
      ? `inline-flex items-center justify-center rounded-full px-3.5 py-2 font-semibold ${defaultTextSize}`.trim()
      : `inline-flex min-h-9 items-center justify-center rounded-full px-3 py-1.5 font-semibold ${defaultTextSize}`.trim();

  const layout = shape === "pill" ? layoutPill : layoutDefault;

  const base = `${layout} transition disabled:opacity-60 disabled:cursor-not-allowed`;

  const variantStyles =
    variant === "purple"
      ? "bg-brand-accent text-white hover:opacity-90"
      : variant === "white"
        ? "border border-brand-accent bg-white text-brand-dark hover:bg-brand-background"
        : variant === "grey"
          ? "text-white hover:opacity-90"
          : "bg-brand-primary text-white shadow-sm hover:opacity-90";

  const bgStyle =
    variant === "grey"
      ? { backgroundColor: "var(--color-button-grey)" }
      : undefined;
  const merged = `${base} ${variantStyles} ${className}`.trim();

  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        style={bgStyle}
        className={`no-underline ${merged} ${disabled ? "pointer-events-none opacity-60" : ""}`.trim()}
        aria-disabled={disabled || undefined}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={bgStyle}
      className={merged}
    >
      {children}
    </button>
  );
}
