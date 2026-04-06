import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageContainer from "@/components/ui/PageContainer";
import SectionHeading from "@/components/ui/SectionHeading";

const sprintTasks = [
  { id: "#124", title: "Build Dashboard", status: "Closed" },
  { id: "#125", title: "Add API Integration", status: "Open" },
  { id: "#126", title: "Improve Error Handling", status: "Open" },
];

const contributors = [
  {
    name: "Anna James",
    commits: "10 Commits",
    issue: "1 issue in Progress",
  },
  {
    name: "Tom Jones",
    commits: "30 Commits",
    issue: "2 issues in Progress",
  },
  {
    name: "Ella Green",
    commits: "15 Commits",
    issue: "1 issue Done",
  },
  {
    name: "Jane Smith",
    commits: "0 Commits",
    issue: "1 issue Not Started",
  },
  {
    name: "John Blue",
    commits: "13 Commits",
    issue: "1 issue Done",
  },
];

const timeline = [
  "April 22 — Merged PR #2",
  "April 22 — Closed Issue #124",
  "April 21 — Emma pushed 6 commits to branch web-ui",
];

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "Closed"
      ? "bg-green-100 text-green-700"
      : "bg-blue-100 text-blue-700";

  return (
    <span
      className={`rounded-full px-sm py-xs text-xs font-semibold ${styles}`}
    >
      {status}
    </span>
  );
}

function MiniStatCard({
  label,
  value,
  dotColor,
}: {
  label: string;
  value: string;
  dotColor: string;
}) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-background p-md shadow-sm">
      <div className="flex items-center gap-sm">
        <span className={`h-3 w-3 rounded-full ${dotColor}`} />
        <p className="text-body-md font-semibold text-brand-dark">{label}</p>
      </div>
      <p className="mt-xs text-body-sm text-brand-dark/70">{value}</p>
    </div>
  );
}

export default function CurrentSprintPage() {
  const progressPercent = 70;

  return (
    <PageContainer>
      <SectionHeading
        title="Current Sprint"
        subtitle="Track sprint progress, tasks, contribution activity, and recent updates."
      />

      <div className="grid gap-lg xl:grid-cols-[2fr_1fr]">
        <div className="space-y-lg">
          <Card>
            <div className="flex items-start justify-between gap-md">
              <div>
                <h2 className="text-h2 font-semibold text-brand-dark">
                  Sprint 4
                </h2>
                <p className="mt-sm text-body-md text-brand-dark/70">
                  Current sprint overview and team delivery progress.
                </p>
              </div>

              <Button>Generate Sprint Review</Button>
            </div>

            <div className="mt-lg rounded-xl border border-brand-border bg-brand-background p-md">
              <p className="text-body-sm font-semibold text-brand-dark">
                Sprint Focus:
              </p>
              <p className="mt-xs text-body-sm text-brand-dark/70">
                This sprint is focused on implementing the dashboard and backend
                API integration.
              </p>
            </div>

            <div className="mt-lg rounded-xl border border-brand-border bg-brand-background p-md">
              <div className="mb-sm flex flex-wrap gap-md text-body-sm text-brand-dark/70">
                <span>
                  <strong className="text-brand-dark">
                    Sprint Start Date:
                  </strong>{" "}
                  April 15, 2026
                </span>
                <span>
                  <strong className="text-brand-dark">Sprint End Date:</strong>{" "}
                  April 29, 2026
                </span>
                <span>
                  <strong className="text-brand-dark">Time Remaining:</strong> 7
                  days
                </span>
              </div>

              <div className="h-3 w-full rounded-full bg-brand-accent/20">
                <div
                  className="h-3 rounded-full bg-brand-accent transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-h3 font-semibold text-brand-dark">
              Sprint Breakdown
            </h2>

            <div className="mt-lg grid gap-md sm:grid-cols-3">
              <MiniStatCard
                label="To Do"
                value="2 Issues"
                dotColor="bg-red-400"
              />
              <MiniStatCard
                label="In Progress"
                value="4 Issues"
                dotColor="bg-yellow-400"
              />
              <MiniStatCard
                label="Done"
                value="2 Issues"
                dotColor="bg-green-400"
              />
            </div>

            <div className="mt-lg grid gap-lg lg:grid-cols-[1.6fr_1fr]">
              <div className="rounded-xl border border-brand-border bg-brand-background p-md">
                <h3 className="text-body-md font-semibold text-brand-dark">
                  Sprint Tasks
                </h3>

                <div className="mt-md flex gap-sm">
                  <Button variant="secondary">All Issues</Button>
                  <Button variant="secondary">Open</Button>
                  <Button variant="secondary">Closed</Button>
                </div>

                <div className="mt-md space-y-sm">
                  {sprintTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border-b border-brand-border pb-sm text-body-sm"
                    >
                      <div className="flex items-center gap-md">
                        <span className="font-medium text-brand-dark/70">
                          {task.id}
                        </span>
                        <span className="text-brand-dark">{task.title}</span>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-brand-border bg-brand-background p-md">
                <h3 className="text-body-md font-semibold text-brand-dark">
                  Contribution Breakdown
                </h3>

                <div className="mt-md space-y-md">
                  {contributors.map((person) => (
                    <div
                      key={person.name}
                      className="border-b border-brand-border pb-sm last:border-b-0"
                    >
                      <p className="text-body-md font-semibold text-brand-dark">
                        {person.name}
                      </p>
                      <p className="mt-xs text-body-sm text-brand-dark/70">
                        {person.commits}
                      </p>
                      <p className="text-body-sm text-brand-dark/70">
                        {person.issue}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-h3 font-semibold text-brand-dark">
              Activity Timeline
            </h2>

            <div className="mt-lg space-y-md">
              {timeline.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-background px-md py-sm"
                >
                  <p className="text-body-md text-brand-dark">{item}</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent/20 text-xs font-semibold text-brand-accent">
                    U
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-lg">
          <Card>
            <h2 className="text-h3 font-semibold text-brand-dark">
              Sprint Summary
            </h2>

            <div className="mt-md space-y-sm text-body-md text-brand-dark/70">
              <p>
                The team is making steady progress on dashboard implementation
                and API integration.
              </p>
              <p>
                Most active contributors this sprint are Tom Jones and Ella
                Green.
              </p>
              <p>
                Focus for the remaining sprint period is closing open issues and
                improving reliability.
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="text-h3 font-semibold text-brand-dark">
              Upcoming Goals
            </h2>

            <ul className="mt-md space-y-sm text-body-md text-brand-dark/70">
              <li>Finish backend API connection</li>
              <li>Resolve error handling issues</li>
              <li>Prepare sprint review summary</li>
            </ul>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
