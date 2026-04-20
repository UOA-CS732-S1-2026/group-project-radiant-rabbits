"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import PageContainer from "@/components/shared/PageContainer";
import SectionHeading from "@/components/shared/SectionHeading";

function toDateInputValue(dateValue: string | Date | null | undefined) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(dateValue: string | Date | null | undefined) {
  if (!dateValue) return "Not set";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function SprintSettings() {
  const [projectStart, setProjectStart] = useState("");
  const [projectEnd, setProjectEnd] = useState("");
  const [sprintLength, setSprintLength] = useState(1);

  const [savedProjectStart, setSavedProjectStart] = useState("");
  const [savedProjectEnd, setSavedProjectEnd] = useState("");
  const [savedSprintLength, setSavedSprintLength] = useState<number | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSprintSettings = useCallback(async () => {
    try {
      setErrorMessage("");

      const response = await fetch("/api/groups/current/sprint-settings", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch sprint settings.");
      }

      const start = toDateInputValue(data.sprintSettings?.projectStartDate);
      const end = toDateInputValue(data.sprintSettings?.projectEndDate);
      const length = data.sprintSettings?.sprintLengthWeeks ?? 1;

      setProjectStart(start);
      setProjectEnd(end);
      setSprintLength(length);

      setSavedProjectStart(start);
      setSavedProjectEnd(end);
      setSavedSprintLength(length);
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(error, "Failed to fetch sprint settings."),
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSprintSettings();
  }, [fetchSprintSettings]);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  const handleSave = async () => {
    if (!projectStart || !projectEnd) {
      setErrorMessage("Please provide both project dates.");
      return;
    }

    if (new Date(projectEnd) <= new Date(projectStart)) {
      setErrorMessage("Project end date must be after project start date.");
      return;
    }

    if (
      !Number.isInteger(sprintLength) ||
      sprintLength < 1 ||
      sprintLength > 3
    ) {
      setErrorMessage("Sprint length must be between 1 and 3 weeks.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      setIsSaved(false);

      const response = await fetch("/api/groups/current/sprint-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectStartDate: projectStart,
          projectEndDate: projectEnd,
          sprintLengthWeeks: sprintLength,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update sprint settings.");
      }

      const updatedStart = toDateInputValue(
        data.sprintSettings?.projectStartDate,
      );
      const updatedEnd = toDateInputValue(data.sprintSettings?.projectEndDate);
      const updatedLength = data.sprintSettings?.sprintLengthWeeks ?? 1;

      setProjectStart(updatedStart);
      setProjectEnd(updatedEnd);
      setSprintLength(updatedLength);

      setSavedProjectStart(updatedStart);
      setSavedProjectEnd(updatedEnd);
      setSavedSprintLength(updatedLength);

      setIsSaved(true);

      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }

      savedTimeoutRef.current = setTimeout(() => {
        setIsSaved(false);
      }, 2000);
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(error, "Failed to update sprint settings."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSprintSettings();
  };

  return (
    <PageContainer>
      <SectionHeading
        title="Sprint Settings"
        subtitle="Configure sprint dates, sprint length, and refresh repository data."
      />

      {errorMessage && (
        <div className="mb-lg rounded-md bg-red-100 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="space-y-lg pb-lg">
        <Card>
          <h2 className="mb-lg text-h3 font-semibold text-brand-dark">
            Current Saved Settings
          </h2>

          {isLoading ? (
            <p className="text-body-md text-brand-dark/70">
              Loading current sprint settings...
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
              <div className="rounded-xl border border-brand-accent/20 bg-brand-surface p-md">
                <p className="text-body-sm text-brand-dark/60">Project Start</p>
                <p className="mt-xs text-body-md font-semibold text-brand-dark">
                  {formatDisplayDate(savedProjectStart)}
                </p>
              </div>

              <div className="rounded-xl border border-brand-accent/20 bg-brand-surface p-md">
                <p className="text-body-sm text-brand-dark/60">Project End</p>
                <p className="mt-xs text-body-md font-semibold text-brand-dark">
                  {formatDisplayDate(savedProjectEnd)}
                </p>
              </div>

              <div className="rounded-xl border border-brand-accent/20 bg-brand-surface p-md">
                <p className="text-body-sm text-brand-dark/60">Sprint Length</p>
                <p className="mt-xs text-body-md font-semibold text-brand-dark">
                  {savedSprintLength
                    ? `${savedSprintLength} week${savedSprintLength > 1 ? "s" : ""}`
                    : "Not set"}
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-lg text-h3 font-semibold text-brand-dark">
            Sprint Configuration
          </h2>

          {isLoading ? (
            <p className="text-body-md text-brand-dark/70">
              Loading sprint settings...
            </p>
          ) : (
            <div className="flex flex-wrap items-start gap-lg">
              <div className="min-w-[220px]">
                <Input
                  id="project-start"
                  label="Project Start"
                  type="date"
                  value={projectStart}
                  onChange={(e) => {
                    setErrorMessage("");
                    setProjectStart(e.target.value);
                  }}
                />
              </div>

              <div className="min-w-[220px]">
                <Input
                  id="project-end"
                  label="Project End"
                  type="date"
                  value={projectEnd}
                  onChange={(e) => {
                    setErrorMessage("");
                    setProjectEnd(e.target.value);
                  }}
                />
              </div>

              <div className="min-w-[180px]">
                <Input
                  id="sprint-length"
                  label="Sprint Length"
                  type="number"
                  value={sprintLength}
                  min={1}
                  max={3}
                  onChange={(e) => {
                    setErrorMessage("");
                    const val = Number(e.target.value);
                    if (Number.isInteger(val) && val >= 1 && val <= 3) {
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
                  {isSaving
                    ? "Saving..."
                    : isSaved
                      ? "Saved ✓"
                      : "Save Settings"}
                </Button>
              </div>
            </div>
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

            <Button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
            >
              {isRefreshing ? "Refreshing…" : "Refresh Data"}
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
