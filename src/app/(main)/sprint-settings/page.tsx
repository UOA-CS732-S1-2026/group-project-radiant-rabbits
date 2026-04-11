"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import PageContainer from "@/components/ui/PageContainer";
import SectionHeading from "@/components/ui/SectionHeading";

export default function SprintSettings() {
  const groupId = "69ca29a7c9329fe21b952367"; //temporary hardcoded group ID until we implement dynamic group handling

  const [projectStart, setProjectStart] = useState("2026-02-01");
  const [projectEnd, setProjectEnd] = useState("2026-06-04");
  const [sprintLength, setSprintLength] = useState(1);

  const [savedSettings, setSavedSettings] = useState<{
    startDate: string;
    endDate: string;
    sprintLength: number;
  } | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchSprintSettings = async () => {
      try {
        const res = await fetch(`/api/sprint-settings?groupId=${groupId}`);

        if (!res.ok) {
          const errorData = await res.json();
          console.error("Fetch sprint settings error:", errorData);
          throw new Error(errorData.error || "Failed to fetch sprint settings");
        }

        const data = await res.json();

        if (data) {
          const formattedSettings = {
            startDate: data.startDate ? data.startDate.split("T")[0] : "",
            endDate: data.endDate ? data.endDate.split("T")[0] : "",
            sprintLength: data.sprintLength ?? 1,
          };

          setSavedSettings(formattedSettings);
          setProjectStart(formattedSettings.startDate);
          setProjectEnd(formattedSettings.endDate);
          setSprintLength(formattedSettings.sprintLength);
        }
      } catch (error) {
        console.error("Error fetching sprint settings:", error);
      }
    };

    fetchSprintSettings();
  }, []); //replace with group ID later

  const handleSave = async () => {
    setMessage("");
    setIsSaving(true);
    setIsSaved(false);

    try {
      if (!projectStart || !projectEnd) {
        setMessage("Please select both a project start and end date.");
        return;
      }

      if (new Date(projectEnd) <= new Date(projectStart)) {
        setMessage("Project end date must be after the project start date.");
        return;
      }

      if (sprintLength < 1 || sprintLength > 4) {
        setMessage("Sprint length must be between 1 and 4 weeks.");
        return;
      }

      const res = await fetch("/api/sprint-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId,
          startDate: projectStart,
          endDate: projectEnd,
          sprintLength,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save sprint settings");
      }

      const updatedSettings = {
        startDate: data.sprintSettings?.startDate
          ? data.sprintSettings.startDate.split("T")[0]
          : projectStart,
        endDate: data.sprintSettings?.endDate
          ? data.sprintSettings.endDate.split("T")[0]
          : projectEnd,
        sprintLength: data.sprintSettings?.sprintLength ?? sprintLength,
      };

      setSavedSettings(updatedSettings);
      setProjectStart(updatedSettings.startDate);
      setProjectEnd(updatedSettings.endDate);
      setSprintLength(updatedSettings.sprintLength);

      setIsSaved(true);
      setMessage("Sprint settings saved successfully.");

      setTimeout(() => {
        setIsSaved(false);
        setMessage("");
      }, 2000);
    } catch (error) {
      console.error("Error saving sprint settings:", error);
      setMessage("Failed to save sprint settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const formatDate = (date: string) => {
    if (!date) return "Not set";
    return new Date(date).toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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
            Current Sprint Settings
          </h2>

          <div className="grid gap-md md:grid-cols-3">
            <div className="rounded-2xl border border-brand-dark/10 bg-white p-md">
              <p className="text-body-sm text-brand-dark/60">Project Start</p>
              <p className="mt-xs text-body-lg font-semibold text-brand-dark">
                {savedSettings
                  ? formatDate(savedSettings.startDate)
                  : "Not set"}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-dark/10 bg-white p-md">
              <p className="text-body-sm text-brand-dark/60">Project End</p>
              <p className="mt-xs text-body-lg font-semibold text-brand-dark">
                {savedSettings ? formatDate(savedSettings.endDate) : "Not set"}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-dark/10 bg-white p-md">
              <p className="text-body-sm text-brand-dark/60">Sprint Length</p>
              <p className="mt-xs text-body-lg font-semibold text-brand-dark">
                {savedSettings
                  ? `${savedSettings.sprintLength} week${
                      savedSettings.sprintLength > 1 ? "s" : ""
                    }`
                  : "Not set"}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-lg text-h3 font-semibold text-brand-dark">
            Edit Sprint Configuration
          </h2>

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
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : isSaved ? "Saved ✓" : "Save Settings"}
              </Button>
            </div>
          </div>

          {message && (
            <p className="mt-md text-body-sm text-brand-dark/70">{message}</p>
          )}
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
