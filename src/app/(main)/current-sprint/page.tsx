"use client";

import { useMemo, useState } from "react";
import BorderedPanel from "@/components/shared/BorderedPanel";
import Card from "@/components/shared/Card";
import PageContainer from "@/components/shared/PageContainer";
import SegmentedControl from "@/components/shared/SegmentedControl";

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
    issue: "2 issue in Progress",
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
  { date: "April 22", text: "Merged PR #2", initials: "A" },
  { date: "April 22", text: "Closed Issue #124", initials: "B" },
  {
    date: "April 21",
    text: "Emma pushed 6 commits to branch web-ui",
    initials: "A",
  },
];

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "Closed"
      ? "bg-green-500  text-brand-surface"
      : "bg-blue-500 text-brand-surface";

  return (
    <span
      className={`inline-flex min-w-16 justify-center rounded-lg px-sm py-xs text-body-xs font-medium ${styles}`}
    >
      {status}
    </span>
  );
}

function BreakdownTile({
  label,
  value,
  dotClass,
}: {
  label: string;
  value: string;
  dotClass: string;
}) {
  return (
    <BorderedPanel shadow>
      <div className="flex items-center gap-sm">
        <span className={`h-sm w-sm rounded-full ${dotClass}`} />
        <span className="text-body-md font-medium text-brand-dark">
          {label}
        </span>
      </div>
      <p className="mt-xs pl-lg text-body-md text-brand-dark/60">{value}</p>
    </BorderedPanel>
  );
}

function FilterChip({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <div className="bg-gray-200 inline-flex p-1">
      <button
        type="button"
        className={
          active
            ? "rounded-md bg-brand-surface px-sm py-xs text-body-xs font-medium text-brand-dark shadow-sm"
            : "px-sm py-xs text-body-xs text-brand-dark/70"
        }
      >
        {label}
      </button>
    </div>
  );
}

export default function CurrentSprintPage() {
  const [issueFilter, setIssueFilter] = useState<string>("all");

  const filteredSprintTasks = useMemo(() => {
    if (issueFilter === "open") {
      return sprintTasks.filter((t) => t.status === "Open");
    }
    if (issueFilter === "closed") {
      return sprintTasks.filter((t) => t.status === "Closed");
    }
    return sprintTasks;
  }, [issueFilter]);

  return (
    <div className="min-h-screen bg-brand-background">
      <PageContainer>
        <Card className="border border-brand-dark/10 border-l-0 p-xl shadow-none">
          <div className="space-y-lg">
            <h2 className="text-h2 font-semibold text-brand-dark">Sprint 4</h2>

            <BorderedPanel as="section">
              <div className="flex items-start justify-between gap-md">
                <div>
                  <h3 className="text-body-lg font-medium text-brand-dark">
                    Sprint Focus:
                  </h3>
                  <p className="text-body-lg text-brand-dark/60">
                    This sprint is focused on implementing the dashboard and
                    backend API integration.
                  </p>
                </div>

                <span className="text-body-md text-brand-dark/70">✎</span>
              </div>
            </BorderedPanel>

            <BorderedPanel as="section">
              <div className="mb-md grid grid-cols-1 gap-sm text-body-md text-brand-dark/60 md:grid-cols-3">
                <p>
                  <span className="font-medium text-brand-dark">
                    Sprint Start Date:
                  </span>{" "}
                  April 15, 2026
                </p>
                <p>
                  <span className="font-medium text-brand-dark">
                    Sprint End Date:
                  </span>{" "}
                  April 29, 2026
                </p>
                <p>
                  <span className="font-medium text-brand-dark">
                    Time Remaining:
                  </span>{" "}
                  7 days
                </p>
              </div>

              <div className="h-sm w-full rounded-full bg-brand-accent/20">
                <div className="h-sm w-2/3 rounded-full bg-brand-accent" />
              </div>
            </BorderedPanel>

            <section>
              <h3 className="mb-md text-h3 font-semibold text-brand-dark">
                Sprint Breakdown
              </h3>

              <div className="grid gap-lg lg:grid-cols-[2.2fr_1fr]">
                <div className="space-y-md">
                  <BorderedPanel>
                    <div className="grid gap-md md:grid-cols-3">
                      <BreakdownTile
                        label="To Do"
                        value="2 Issues"
                        dotClass="bg-red-500"
                      />
                      <BreakdownTile
                        label="In Progress"
                        value="4 Issues"
                        dotClass="bg-yellow-500"
                      />
                      <BreakdownTile
                        label="Done"
                        value="2 Issues"
                        dotClass="bg-green-500"
                      />
                    </div>
                  </BorderedPanel>

                  <BorderedPanel>
                    <h4 className="text-body-lg font-semibold text-brand-dark">
                      Sprint Tasks
                    </h4>

                    <div className="py-3 inline-flex rounded-lg bg-brand-background">
                      <FilterChip label="All Issues" active />
                      <FilterChip label="Open" />
                      <FilterChip label="Closed" />
                    </div>

                    <div className="mt-lg overflow-y-auto pr-sm">
                      <div className="space-y-md">
                        {filteredSprintTasks.map((task) => (
                          <div
                            key={task.id}
                            className="grid grid-cols-[5rem_1fr_5rem] items-center border-b border-brand-dark/10 pb-sm text-body-md"
                          >
                            <span className="text-brand-dark/60">
                              {task.id}
                            </span>
                            <span className="text-brand-dark/70">
                              {task.title}
                            </span>
                            <div className="flex justify-end">
                              <StatusBadge status={task.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </BorderedPanel>

                  <BorderedPanel>
                    <h4 className="text-body-lg font-semibold text-brand-dark">
                      Activity Timeline
                    </h4>

                    <div className="mt-md space-y-md">
                      {timeline.map((item, index) => (
                        <div
                          key={`${item.date}-${index}`}
                          className="grid grid-cols-[5rem_1fr_2.5rem] items-center gap-md border-b border-brand-dark/10 pb-sm"
                        >
                          <div className="text-body-md text-brand-dark/60">
                            {item.date}
                          </div>

                          <div className="flex items-center gap-sm text-body-md text-brand-dark/70">
                            <span className="text-brand-dark/40">↑</span>
                            <span>{item.text}</span>
                          </div>

                          <div className="flex h-lg w-lg items-center justify-center rounded-xl bg-brand-accent/50 text-body-xs font-medium text-brand-dark">
                            {item.initials}
                          </div>
                        </div>
                      ))}
                    </div>
                  </BorderedPanel>
                </div>

                <BorderedPanel>
                  <h4 className="text-body-lg font-semibold text-brand-dark">
                    Contribution Breakdown
                  </h4>

                  <div className="mt-md space-y-lg">
                    {contributors.map((person) => (
                      <div
                        key={person.name}
                        className="border-b border-brand-dark/10 pb-md"
                      >
                        <p className="text-body-lg font-semibold text-brand-dark">
                          {person.name}
                        </p>
                        <p className="mt-xs text-body-md text-brand-dark/50">
                          {person.commits}
                        </p>
                        <p className="text-body-md text-brand-dark/50">
                          {person.issue}
                        </p>
                      </div>
                    ))}
                  </div>
                </BorderedPanel>
              </div>
            </section>
          </div>
        </Card>
      </PageContainer>
    </div>
  );
}
