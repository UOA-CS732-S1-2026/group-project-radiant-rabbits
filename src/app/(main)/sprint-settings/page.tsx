"use client";

import { useState } from "react";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import PageContainer from "@/components/shared/PageContainer";
import SectionHeading from "@/components/shared/SectionHeading";

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

          {/* 🔥 FIXED ALIGNMENT */}
          <div className="flex flex-wrap items-start gap-lg">
            <div className="min-w-[220px]">
              <Input
                id="project-start"
                label="Project Start"
                type="date"
                value={projectStart}
                onChange={(e) => setProjectStart(e.target.value)}
              />
            </div>

            <div className="min-w-[220px]">
              <Input
                id="project-end"
                label="Project End"
                type="date"
                value={projectEnd}
                onChange={(e) => setProjectEnd(e.target.value)}
              />
            </div>

            <div className="min-w-[180px]">
              <Input
                id="sprint-length"
                label="Sprint Length"
                type="number"
                value={sprintLength}
                min={1}
                max={4}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isNaN(val) && val >= 1 && val <= 4) {
                    setSprintLength(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (
                    e.key !== "ArrowUp" &&
                    e.key !== "ArrowDown" &&
                    e.key !== "Tab"
                  ) {
                    e.preventDefault();
                  }
                }}
                onPaste={(e) => e.preventDefault()}
                className="w-20 text-center"
              />
              <p className="mt-xs text-body-sm text-brand-dark/60">weeks</p>
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
