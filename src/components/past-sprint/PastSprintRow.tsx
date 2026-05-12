import { ChevronRight } from "lucide-react";
import Link from "next/link";

export type PastSprintRowData = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  summary: string;
  commits: number;
  issuesClosed: number;
  pullRequestsMerged: number;
};

type PastSprintRowProps = {
  sprint: PastSprintRowData;
  isFirst: boolean;
  groupId?: string;
};

function formatDate(value: Date) {
  return value.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
  });
}

// Component to display a single past sprint row
export default function PastSprintRow({
  sprint,
  isFirst,
  groupId,
}: PastSprintRowProps) {
  const className = `flex w-full items-center justify-between gap-md px-lg py-md text-left transition hover:bg-brand-dark/5 ${
    isFirst ? "" : "border-t border-brand-dark/10"
  }`;
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <h3 className="text-(length:--text-body-lg) font-semibold text-brand-dark">
          {sprint.name}
        </h3>
        <p className="text-(length:--text-body-sm) text-brand-dark/60">
          {formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}
        </p>
        <p className="mt-xs text-(length:--text-body-sm) font-medium text-brand-accent">
          Click to view sprint review
        </p>
        <p className="mt-xs text-(length:--text-body-sm) text-brand-dark/70">
          {sprint.summary}
        </p>
      </div>

      <div className="flex shrink-0 gap-md text-right">
        <div>
          <p className="text-(length:--text-body-md) font-semibold text-brand-dark">
            {sprint.commits}
          </p>
          <p className="text-(length:--text-body-xs) text-brand-dark/60">
            commits
          </p>
        </div>
        <div>
          <p className="text-(length:--text-body-md) font-semibold text-brand-dark">
            {sprint.pullRequestsMerged}
          </p>
          <p className="text-(length:--text-body-xs) text-brand-dark/60">PRs</p>
        </div>
        <div>
          <p className="text-(length:--text-body-md) font-semibold text-brand-dark">
            {sprint.issuesClosed}
          </p>
          <p className="text-(length:--text-body-xs) text-brand-dark/60">
            issues
          </p>
        </div>
      </div>

      <ChevronRight size={20} className="shrink-0 text-brand-dark/40" />
    </>
  );

  if (groupId) {
    return (
      <Link
        href={`/summary?groupId=${groupId}&sprintId=${sprint.id}&autoGenerate=1`}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className}>
      {content}
    </button>
  );
}
