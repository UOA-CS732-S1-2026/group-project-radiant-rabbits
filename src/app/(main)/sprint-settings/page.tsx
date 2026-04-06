"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageContainer from "@/components/ui/PageContainer";
import SectionHeading from "@/components/ui/SectionHeading";

export default function SprintSettings() {
  const [projectStart, setProjectStart] = useState("2026-02-01");
  const [projectEnd, setProjectEnd] = useState("2026-06-04");
  const [sprintLength, setSprintLength] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <PageContainer>
      <SectionHeading
        title="Sprint Settings"
        subtitle="Configure sprint dates, sprint length, and refresh repository data."
      />

      <div className="space-y-lg">
        <Card>
          <h2 className="mb-lg text-h3 font-semibold text-brand-dark">
            Sprint Configuration
          </h2>

          <div className="flex flex-wrap items-end gap-lg">
            <div className="flex min-w-[220px] flex-col gap-xs">
              <label
                htmlFor="project-start"
                className="text-body-sm font-medium text-brand-dark/70"
              >
                Project Start
              </label>
              <input
                id="project-start"
                type="date"
                value={projectStart}
                onChange={(e) => setProjectStart(e.target.value)}
                className="cursor-pointer rounded-lg border border-brand-dark/15 bg-brand-background px-md py-sm text-body-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-accent"
              />
            </div>

            <div className="flex min-w-[220px] flex-col gap-xs">
              <label
                htmlFor="project-end"
                className="text-body-sm font-medium text-brand-dark/70"
              >
                Project End
              </label>
              <input
                id="project-end"
                type="date"
                value={projectEnd}
                onChange={(e) => setProjectEnd(e.target.value)}
                className="cursor-pointer rounded-lg border border-brand-dark/15 bg-brand-background px-md py-sm text-body-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-accent"
              />
            </div>

            <div className="flex min-w-[180px] flex-col gap-xs">
              <label
                htmlFor="sprint-length"
                className="text-body-sm font-medium text-brand-dark/70"
              >
                Sprint Length
              </label>

              <div className="flex items-center gap-sm">
                <input
                  id="sprint-length"
                  type="number"
                  min={1}
                  max={8}
                  value={sprintLength}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= 1 && val <= 8) {
                      setSprintLength(val);
                    }
                  }}
                  className="w-20 rounded-lg border border-brand-dark/15 bg-brand-background px-md py-sm text-center text-body-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
                <span className="text-body-sm text-brand-dark/60">weeks</span>
              </div>
            </div>

            <div className="ml-auto">
              <Button onClick={handleSave}>
                {isSaved ? "Saved ✓" : "Save Settings"}
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-md md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="mb-xs text-h3 font-semibold text-brand-dark">
                Data Refresh
              </h2>
              <p className="text-body-md text-brand-dark/70">
                Refresh repository data to fetch the latest commits, issues, and
                pull requests.
              </p>
            </div>

            <Button onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing…" : "Refresh Data"}
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
