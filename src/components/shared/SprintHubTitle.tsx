import type { ReactNode } from "react";

export type SprintHubTitleSize = "display" | "hero" | "lg" | "md" | "sm";

export type SprintHubTitleVariant = "gradient" | "white";

const sizeClasses: Record<SprintHubTitleSize, string> = {
  display: "text-5xl leading-[1.06] sm:text-6xl md:text-7xl lg:text-8xl",
  hero: "text-4xl leading-[1.08] sm:text-5xl md:text-6xl",
  lg: "text-2xl leading-tight sm:text-3xl",
  md: "text-xl leading-tight sm:text-2xl",
  sm: "text-base leading-tight sm:text-lg",
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
