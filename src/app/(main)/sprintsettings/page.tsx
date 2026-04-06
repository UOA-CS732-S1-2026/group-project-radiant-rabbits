"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageContainer from "@/components/ui/PageContainer";

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
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-brand-text">
          Sprint Settings
        </h1>

        {/* Sprint Configuration Card */}
        <Card>
          <h2 className="text-base font-semibold text-brand-text mb-4">
            Sprint Configuration
          </h2>

          <div className="flex flex-wrap items-end gap-6">
            {/* Project Start */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="project-start"
                className="text-sm text-brand-muted font-medium"
              >
                Project Start
              </label>
              <input
                id="project-start"
                type="date"
                value={projectStart}
                onChange={(e) => setProjectStart(e.target.value)}
                className="rounded-md border border-brand-border bg-brand-bg px-3 py-2 pr-9 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent cursor-pointer"
              />
            </div>

            {/* Project End */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="project-end"
                className="text-sm text-brand-muted font-medium"
              >
                Project End
              </label>
              <input
                id="project-end"
                type="date"
                value={projectEnd}
                onChange={(e) => setProjectEnd(e.target.value)}
                className="rounded-md border border-brand-border bg-brand-bg px-3 py-2 pr-9 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent cursor-pointer"
              />
            </div>

            {/* Sprint Length */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="sprint-length"
                className="text-sm text-brand-muted font-medium"
              >
                Sprint Length
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="sprint-length"
                  type="number"
                  min={1}
                  max={8}
                  value={sprintLength}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= 1) setSprintLength(val);
                  }}
                  className="w-16 rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text text-center focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
                <span className="text-sm text-brand-muted">weeks</span>
              </div>
            </div>

            {/* Save Button */}
            <div className="ml-auto">
              <Button onClick={handleSave}>
                {isSaved ? "Saved ✓" : "Save Settings"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Data Refresh Card */}
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-brand-text mb-1">
                Data Refresh
              </h2>
              <p className="text-sm text-brand-muted">
                Refresh repository data to fetch the latest commits, issues and
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
