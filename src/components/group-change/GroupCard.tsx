import type { ReactNode } from "react";

interface GroupCardProps {
  children?: ReactNode;
  className?: string;
}

export default function GroupCard({
  children,
  className = "",
}: GroupCardProps) {
  return (
    <div
      className="w-full rounded-2xl p-[3px]"
      style={{ background: "linear-gradient(to right, #7BB8FF, #B8A9FE)" }}
    >
      <div
        className={`w-full rounded-2xl bg-[#F1F5F9] px-4 py-4 md:px-5 md:py-5 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
