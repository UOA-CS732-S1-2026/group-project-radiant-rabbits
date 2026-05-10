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

// Individual bars showing each contributor's commits, PRs, and issues.
function RepoContributionBars({ rows }: { rows: ContributorRow[] }) {
  const max = Math.max(
    ...rows.map((row) => row.commits + row.prs + row.issues),
    1,
  );

  return (
    <div className="flex flex-col">
      <div className="overflow-y-auto">
        {rows.map((row) => {
          return (
            <div
              key={row.name}
              className="grid grid-cols-[2.5fr_7.5fr] grid-rows-[auto_auto_auto]"
            >
              {/* Contributor name and avatar */}
              <div className="row-start-2 flex w-full items-center ml-lg gap-sm min-w-0 text-left">
                <Avatar
                  name={row.name}
                  initials={row.initials}
                  avatarUrl={row.avatarUrl}
                  size={24}
                />
                <span className="text-left text-(length:--text-body-sm) font-medium text-brand-dark">
                  {row.name}
                </span>
              </div>
              {/* Contribution bars */}
              <div className="row-span-3 flex flex-col">
                {/* Commits bar */}
                <div className="flex items-center mt-md gap-sm">
                  <div className="w-12 text-right">
                    <span className="text-brand-accent font-semibold text-(length:--text-body-xs)">
                      {row.commits}
                    </span>
                  </div>
                  <div className="flex flex-1 h-4 overflow-hidden rounded-full bg-brand-dark/5">
                    <div
                      className="bg-brand-accent"
                      style={{ width: `${(row.commits / max) * 100}%` }}
                    />
                  </div>
                </div>
                {/* PRs bar */}
                <div className="flex items-center gap-sm">
                  <div className="w-12 text-right">
                    <span className="text-brand-completed/60 font-semibold text-(length:--text-body-xs)">
                      {row.prs}
                    </span>
                  </div>
                  <div className="flex flex-1 h-4 overflow-hidden rounded-full bg-brand-dark/5">
                    <div
                      className="bg-brand-completed/60"
                      style={{ width: `${(row.prs / max) * 100}%` }}
                    />
                  </div>
                </div>
                {/* Issues bar */}
                <div className="flex items-center mb-lg gap-sm">
                  <div className="w-12 text-right">
                    <span className="text-brand-in-progress/70 font-semibold text-(length:--text-body-xs)">
                      {row.issues}
                    </span>
                  </div>
                  <div className="flex flex-1 h-4 overflow-hidden rounded-full bg-brand-dark/5">
                    <div
                      className="bg-brand-in-progress/70"
                      style={{ width: `${(row.issues / max) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-auto flex flex-wrap gap-md pt-md text-(length:--text-body-xs) text-brand-dark/50">
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
          <h3 className="text-(length:--text-body-lg) font-semibold text-brand-dark">
            Contribution Breakdown
          </h3>
          <p className="text-(length:--text-body-xs) text-brand-dark/50">
            Total work across the repository, by person
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <RepoContributionBars rows={contributors} />
      </div>
    </Card>
  );
}
