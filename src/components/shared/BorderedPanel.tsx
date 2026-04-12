import type { ReactNode } from "react";

type BorderedPanelAs = "div" | "section" | "article";

type BorderedPanelProps = {
  children: ReactNode;
  className?: string;
  as?: BorderedPanelAs;
  shadow?: boolean;
};

export default function BorderedPanel({
  children,
  className = "p-md",
  as: Tag = "div",
  shadow = false,
}: BorderedPanelProps) {
  return (
    <Tag
      className={`rounded-xl border border-brand-dark/10 bg-brand-surface ${className}${shadow ? " shadow-md" : ""}`}
    >
      {children}
    </Tag>
  );
}
