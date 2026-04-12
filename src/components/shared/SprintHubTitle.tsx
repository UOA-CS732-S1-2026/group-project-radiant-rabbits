import type { ReactNode } from "react";

export type SprintHubTitleSize = "hero" | "lg" | "md" | "sm";

const sizeClasses: Record<SprintHubTitleSize, string> = {
  hero: "text-4xl leading-[1.08] sm:text-5xl md:text-6xl",
  lg: "text-2xl leading-tight sm:text-3xl",
  md: "text-xl leading-tight sm:text-2xl",
  sm: "text-base leading-tight sm:text-lg",
};

type SprintHubTitleProps = {
  children?: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "p" | "span";
  size?: SprintHubTitleSize;
};

export default function SprintHubTitle({
  children = "SprintHub",
  className = "",
  as: Tag = "h1",
  size = "hero",
}: SprintHubTitleProps) {
  return (
    <Tag
      className={`bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text font-extrabold text-transparent tracking-tight ${sizeClasses[size]} ${className}`}
    >
      {children}
    </Tag>
  );
}
