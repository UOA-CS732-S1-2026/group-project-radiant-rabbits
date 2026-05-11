import type { ReactNode } from "react";

/**
 * Blue guidance shell used for iteration / sprint empty states (dashboard,
 * current sprint, past sprints).
 */
export default function GitHubIterationGuidanceCallout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/10 p-md">
      <p className="text-body-md font-semibold text-brand-dark sm:text-body-lg">
        {title}
      </p>
      <div className="mt-md">{children}</div>
    </div>
  );
}
