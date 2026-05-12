import Avatar from "@/components/shared/Avatar";
import BorderedPanel from "@/components/shared/BorderedPanel";

type Contributor = {
  name: string;
  initials: string;
  avatarUrl: string | null;
  commits: number;
  prs: number;
  issues: number;
};

type ContributionCardProps = {
  contributors: Contributor[];
  groupId?: string;
  sprintId?: string;
  className?: string;
};

export default function ContributionCard({
  contributors,
  groupId: _groupId,
  sprintId: _sprintId,
  className = "",
}: ContributionCardProps) {
  return (
    <BorderedPanel
      className={`flex h-full max-h-128 flex-col overflow-hidden p-md ${className}`}
    >
      <div className="mb-md">
        <h4 className="text-(length:--text-body-lg) font-semibold text-brand-dark">
          Contribution - this sprint
        </h4>
        <p className="text-(length:--text-body-xs) text-brand-dark/50">
          Total work this sprint, by person
        </p>
      </div>

      {contributors.length === 0 ? (
        <p className="mt-md text-(length:--text-body-md) text-brand-dark/60">
          No contributor activity in this sprint period.
        </p>
      ) : (
        <div className="h-96 space-y-sm overflow-y-auto pr-xs">
          {contributors.map((person, index) => (
            <div
              key={person.name}
              className={
                index === 0 ? "" : "border-t border-brand-dark/10 pt-md"
              }
            >
              <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-md py-sm text-(length:--text-body-sm)">
                <Avatar
                  name={person.name}
                  initials={person.initials}
                  avatarUrl={person.avatarUrl}
                  size={32}
                />
                <div className="min-w-0">
                  <p className="truncate text-(length:--text-body-sm) font-medium text-brand-dark">
                    {person.name}
                  </p>
                  <p className="text-(length:--text-body-xs) text-brand-dark/60">
                    <span className="font-semibold">{person.commits}</span>{" "}
                    commits -{" "}
                    <span className="font-semibold">{person.prs}</span> PRs -{" "}
                    <span className="font-semibold">{person.issues}</span>{" "}
                    issues
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </BorderedPanel>
  );
}
