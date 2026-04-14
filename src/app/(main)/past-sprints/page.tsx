import BorderedPanel from "@/components/shared/BorderedPanel";
import Card from "@/components/shared/Card";
import PageContainer from "@/components/shared/PageContainer";
import SectionHeading from "@/components/shared/SectionHeading";

const pastSprints = [
  {
    id: "sprint-1",
    name: "Sprint 1",
    startDate: "Feb 1, 2026",
    endDate: "Feb 14, 2026",
    summary: "Initial project setup, repository structure, and planning.",
    commits: 24,
    issuesClosed: 8,
  },
  {
    id: "sprint-2",
    name: "Sprint 2",
    startDate: "Feb 15, 2026",
    endDate: "Feb 28, 2026",
    summary: "Implemented authentication flow and basic dashboard wireframes.",
    commits: 31,
    issuesClosed: 10,
  },
  {
    id: "sprint-3",
    name: "Sprint 3",
    startDate: "Mar 1, 2026",
    endDate: "Mar 14, 2026",
    summary: "Connected backend endpoints and refined UI components.",
    commits: 29,
    issuesClosed: 9,
  },
  {
    id: "sprint-4",
    name: "Sprint 4",
    startDate: "Mar 15, 2026",
    endDate: "Mar 28, 2026",
    summary: "Added sprint review insights and improved contribution tracking.",
    commits: 36,
    issuesClosed: 12,
  },
];

function SprintSummaryStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-brand-background px-md py-sm">
      <p className="text-body-xs font-medium text-brand-dark/60">{label}</p>
      <p className="mt-xs text-body-md font-semibold text-brand-dark">
        {value}
      </p>
    </div>
  );
}

export default function PastSprintsPage() {
  return (
    <PageContainer>
      <SectionHeading
        title="Past Sprints"
        subtitle="Browse completed sprints and review key delivery details."
      />

      <Card className="border border-brand-dark/10 border-l-0 shadow-none">
        <BorderedPanel className="p-lg">
          <h2 className="text-h3 font-semibold text-brand-dark">
            Completed Sprints
          </h2>
          <p className="mt-xs text-body-md text-brand-dark/70">
            A list of completed sprints with dates and summary information.
          </p>

          <div className="mt-lg space-y-md">
            {pastSprints.map((sprint) => (
              <button
                key={sprint.id}
                type="button"
                className="w-full rounded-xl border border-brand-dark/10 bg-brand-surface px-lg py-lg text-left transition hover:border-brand-accent hover:bg-brand-background"
              >
                <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-body-lg font-semibold text-brand-dark">
                      {sprint.name}
                    </h3>

                    <p className="mt-xs text-body-sm text-brand-dark/60">
                      {sprint.startDate} - {sprint.endDate}
                    </p>

                    <p className="mt-sm text-body-md text-brand-dark/70">
                      {sprint.summary}
                    </p>

                    <p className="mt-sm text-body-sm font-medium text-brand-accent">
                      Click to view more details
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-sm lg:min-w-[220px]">
                    <SprintSummaryStat label="Commits" value={sprint.commits} />
                    <SprintSummaryStat
                      label="Issues Closed"
                      value={sprint.issuesClosed}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </BorderedPanel>
      </Card>
    </PageContainer>
  );
}
