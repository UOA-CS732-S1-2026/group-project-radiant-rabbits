"use client";

import { useState } from "react";
import Avatar from "@/components/shared/Avatar";
import Card from "@/components/shared/Card";
import FilterChip from "@/components/shared/FilterChip";

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

function RepoContributionBars({
  rows,
  metric,
}: {
  rows: ContributorRow[];
  metric: "all" | "commits" | "prs" | "issues";
}) {
  const maxCommits = Math.max(...rows.map((r) => r.commits), 1);
  const maxPrs = Math.max(...rows.map((r) => r.prs), 1);
  const maxIssues = Math.max(...rows.map((r) => r.issues), 1);
  // Normalize each metric against its own max so sparse PR/issue activity is
  // still visible instead of being dwarfed by commit counts.

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-lg flex flex-col">
        {rows.map((row) => {
          return (
            <div
              key={row.name}
              className="grid grid-cols-[3fr_7fr] items-center ml-sm mr-sm gap-sm"
            >
              {/* Keep identity next to the bar so filtering metrics does not
                  make users re-scan a separate legend. */}
              <div className="flex items-center gap-sm min-w-0">
                <Avatar
                  name={row.name}
                  initials={row.initials}
                  avatarUrl={row.avatarUrl}
                  size={24}
                />
                <span className="truncate text-(length:--text-body-sm) font-medium text-brand-dark">
                  {row.name}
                </span>
              </div>

              {/* One metric at a time avoids implying that commits, PRs, and
                  issues are directly comparable units of work. */}
              {metric === "commits" ? (
                <div className="flex flex-1">
                  <div className="flex flex-1 h-5 overflow-hidden rounded-full bg-brand-dark/5">
                    <div
                      className="bg-brand-accent"
                      style={{ width: `${(row.commits / maxCommits) * 100}%` }}
                    />
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-brand-accent/70 font-semibold text-(length:--text-body-xs)">
                      {row.commits}
                    </span>
                  </div>
                </div>
              ) : metric === "prs" ? (
                <div className="flex flex-1">
                  <div className="flex flex-1 h-5 overflow-hidden rounded-full bg-brand-dark/5">
                    <div
                      className="bg-brand-completed/60"
                      style={{ width: `${(row.prs / maxPrs) * 100}%` }}
                    />
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-brand-completed/60 font-semibold text-(length:--text-body-xs)">
                      {row.prs}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1">
                  <div className="flex flex-1 h-5 overflow-hidden rounded-full bg-brand-dark/5">
                    <div
                      className="bg-brand-in-progress/70"
                      style={{ width: `${(row.issues / maxIssues) * 100}%` }}
                    />
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-brand-in-progress/70 font-semibold text-(length:--text-body-xs)">
                      {row.issues}
                    </span>
                  </div>
                </div>
              )}
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

export default function ContributionBreakdownCard({
  contributors,
}: ContributionBreakdownCardProps) {
  const [metric, setMetric] = useState<"commits" | "prs" | "issues">("commits");

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

      <div className="mb-md">
        <div className="inline-flex flex-wrap gap-1 rounded-md bg-brand-dark/5 p-xs">
          <FilterChip
            label={`Commits (${contributors.reduce((s, c) => s + c.commits, 0)})`}
            active={metric === "commits"}
            onClick={() => setMetric("commits")}
          />
          <FilterChip
            label={`PRs (${contributors.reduce((s, c) => s + c.prs, 0)})`}
            active={metric === "prs"}
            onClick={() => setMetric("prs")}
          />
          <FilterChip
            label={`Issues (${contributors.reduce((s, c) => s + c.issues, 0)})`}
            active={metric === "issues"}
            onClick={() => setMetric("issues")}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <RepoContributionBars rows={contributors} metric={metric} />
      </div>
    </Card>
  );
}
