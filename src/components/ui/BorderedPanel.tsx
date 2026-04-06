import type { ReactNode } from "react";

type BorderedPanelProps = {
  children: ReactNode;
  className?: string;
};

export default function BorderedPanel({
  children,
  className = "",
}: BorderedPanelProps) {
  return (
    <div
      className={`rounded-xl border border-brand-dark/10 bg-brand-surface p-md ${className}`}
    >
      {children}
    </div>
  );
}
