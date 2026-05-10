import type { ReactNode } from "react";

export type SprintHubTitleSize = "display" | "hero" | "lg" | "md" | "sm";

export type SprintHubTitleVariant = "gradient" | "white";

const sizeClasses: Record<SprintHubTitleSize, string> = {
  display: "text-(length:--text-display) leading-[1.06]",
  hero: "text-(length:--text-hero) leading-[1.08]",
  lg: "text-(length:--text-title-lg) leading-tight",
  md: "text-(length:--text-title-md) leading-tight",
  sm: "text-(length:--text-title-sm) leading-tight",
};

const variantClasses: Record<SprintHubTitleVariant, string> = {
  gradient:
    "bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent",
  white: "text-white drop-shadow-sm",
};

type SprintHubTitleProps = {
  children?: ReactNode;
  className?: string;
  id?: string;
  as?: "h1" | "h2" | "p" | "span";
  size?: SprintHubTitleSize;
  /** `gradient` matches main nav; `white` for use on ombre / colored bars. */
  variant?: SprintHubTitleVariant;
};

export default function SprintHubTitle({
  children = "SprintHub",
  className = "",
  id,
  as: Tag = "h1",
  size = "hero",
  variant = "gradient",
}: SprintHubTitleProps) {
  return (
    <Tag
      id={id}
      className={`font-extrabold tracking-tight ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </Tag>
  );
}
