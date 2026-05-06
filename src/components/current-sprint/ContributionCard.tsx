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
  className?: string;
};

// Component for displaying a contributor's activity in current sprint
export default function ContributionCard({
  contributors,
  className = "",
}: ContributionCardProps) {
  if (contributors.length === 0) {
    return (
      <BorderedPanel className={`p-md ${className}`}>
        <h4 className="text-body-lg font-semibold text-brand-dark">
          Contribution · this sprint
        </h4>
        <p className="mt-xs text-body-xs text-brand-dark/50">By person</p>
        <p className="mt-md text-body-md text-brand-dark/60">
          No contributor activity in this sprint period.
        </p>
      </BorderedPanel>
    );
  }

  // If there are contributors, display their activity
  return (
    <BorderedPanel className={`p-md ${className}`}>
      <div className="mb-md">
        <h4 className="text-body-lg font-semibold text-brand-dark">
          Contribution · this sprint
        </h4>
        <p className="text-body-xs text-brand-dark/50">By person</p>
      </div>

      <div className="max-h-96 space-y-sm overflow-y-auto pr-xs">
        {contributors.map((person, index) => (
          <div
            key={person.name}
            className={`grid grid-cols-[2rem_1fr] items-center gap-md py-sm ${
              index === 0 ? "" : "border-t border-brand-dark/10 pt-md"
            }`}
          >
            <Avatar
              name={person.name}
              initials={person.initials}
              avatarUrl={person.avatarUrl}
              size={32}
            />
            <div className="min-w-0">
              <p className="truncate text-body-sm font-medium text-brand-dark">
                {person.name}
              </p>
              <p className="text-body-xs text-brand-dark/60">
                <span className="font-semibold">{person.commits}</span> commits
                · <span className="font-semibold">{person.prs}</span> PRs ·{" "}
                <span className="font-semibold">{person.issues}</span> issues
              </p>
            </div>
          </div>
        ))}
      </div>
    </BorderedPanel>
  );
}
