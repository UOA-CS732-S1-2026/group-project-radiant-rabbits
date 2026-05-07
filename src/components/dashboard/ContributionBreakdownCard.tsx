import Avatar from "@/components/shared/Avatar";
import Card from "@/components/shared/Card";

type ContributorRow = {
  name: string;
  initials: string;
  avatarUrl: string | null;
  commits: number;
  prs: number;
  issues: number;
  colour: string;
};

type ContributionBreakdownCardProps = {
  contributors: ContributorRow[];
};

// Stacked bars showing each contributor's commits, PRs, and issues.
function RepoContributionBars({ rows }: { rows: ContributorRow[] }) {
  const max = Math.max(
    ...rows.map((row) => row.commits + row.prs + row.issues),
    1,
  );

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-lg">
        {rows.map((row) => {
          const total = row.commits + row.prs + row.issues;
          return (
            <div
              key={row.name}
              className="grid grid-cols-[110px_1fr_48px] items-center gap-md"
            >
              <div className="flex items-center gap-sm min-w-0">
                <Avatar
                  name={row.name}
                  initials={row.initials}
                  avatarUrl={row.avatarUrl}
                  size={24}
                />
                <span className="truncate text-body-sm font-medium text-brand-dark">
                  {row.name}
                </span>
              </div>
              <div className="flex h-5 overflow-hidden rounded-full bg-brand-dark/5">
                <div
                  className="bg-brand-accent"
                  style={{ width: `${(row.commits / max) * 100}%` }}
                />
                <div
                  className="bg-brand-completed/60"
                  style={{ width: `${(row.prs / max) * 100}%` }}
                />
                <div
                  className="bg-brand-in-progress/70"
                  style={{ width: `${(row.issues / max) * 100}%` }}
                />
              </div>
              <div className="text-right text-body-xs font-semibold text-brand-dark/60">
                {total}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-auto flex flex-wrap gap-md pt-md text-body-xs text-brand-dark/50">
        <span className="inline-flex items-center gap-xs">
          <span className="h-2 w-2 rounded-full bg-brand-accent" />
          Commits
        </span>
        <span className="inline-flex items-center gap-xs">
          <span className="h-2 w-2 rounded-full bg-brand-completed/60" />
          PRs
        </span>
        <span className="inline-flex items-center gap-xs">
          <span className="h-2 w-2 rounded-full bg-brand-in-progress/70" />
          Issues
        </span>
      </div>
    </div>
  );
}

// Component for the repository contribution breakdown card (one row per contributor)
export default function ContributionBreakdownCard({
  contributors,
}: ContributionBreakdownCardProps) {
  return (
    <Card className="flex flex-col p-md">
      <div className="mb-md flex items-start justify-between gap-md">
        <div>
          <p className="mb-xs text-body-xs font-semibold uppercase tracking-[0.14em] text-brand-dark/45">
            Repository contribution
          </p>
          <h3 className="text-body-lg font-semibold text-brand-dark">
            Contribution breakdown
          </h3>
          <p className="text-body-xs text-brand-dark/50">
            Total work across the repo, by person
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <RepoContributionBars rows={contributors} />
      </div>
    </Card>
  );
}
