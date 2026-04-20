"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Button from "@/components/ui/Button";
import GroupCard from "@/components/ui/GroupCard";
import SprintHubTitle from "@/components/ui/SprintHubTitle";

const fieldColumnClass =
  "w-full max-w-[18rem] min-w-0 justify-self-start sm:max-w-[17rem]";

const dateFieldClass = `${fieldColumnClass} min-h-12 rounded-lg border border-brand-accent/50 bg-brand-surface px-md py-2 text-body-md leading-tight text-brand-dark shadow-sm outline-none transition-shadow [color-scheme:light] focus:ring-2 focus:ring-brand-primary sm:min-h-[3.25rem]`;

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addCalendarMonths(base: Date, months: number): Date {
  const d = new Date(base.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function SetGroupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const repoName = searchParams.get("repoName");
  const repoOwner = searchParams.get("repoOwner");

  const [projectStart, setProjectStart] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [projectEnd, setProjectEnd] = useState(() => {
    const today = new Date();
    return toDateInputValue(addCalendarMonths(today, 2));
  });
  const [sprintLengthWeeks, setSprintLengthWeeks] = useState<number>(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCreateGroup = async () => {
    if (!repoName || !repoOwner) {
      setErrorMessage(
        "Missing repository information. Please go back and select a repository again.",
      );
      return;
    }

    if (!projectStart || !projectEnd) {
      setErrorMessage("Please provide both project dates.");
      return;
    }

    if (new Date(projectEnd) <= new Date(projectStart)) {
      setErrorMessage("Project end date must be after project start date.");
      return;
    }

    const sprintLengthNumber = Number(sprintLengthWeeks);

    if (
      !Number.isInteger(sprintLengthNumber) ||
      sprintLengthNumber < 1 ||
      sprintLengthNumber > 3
    ) {
      setErrorMessage("Sprint length must be between 1 and 3 weeks.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoOwner,
          repoName,
          description: `Group for ${repoOwner}/${repoName}`,
          projectStartDate: projectStart,
          projectEndDate: projectEnd,
          sprintLengthWeeks: sprintLengthNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create group.");
      }

      router.push("/dashboard");
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to create group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col justify-start px-0 pt-0 sm:px-lg">
        <div className="flex w-full max-w-full min-w-0 flex-col items-stretch gap-4 sm:mx-auto sm:w-fit sm:gap-5">
          {errorMessage && (
            <div className="rounded-md bg-red-100 p-3 text-center text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <GroupCard>
            <div className="grid w-full min-w-0 grid-cols-1 gap-y-2.5 sm:grid-cols-[minmax(0,13rem)_1fr] sm:items-center sm:gap-x-7 sm:gap-y-4">
              <label
                htmlFor="set-group-start"
                className="text-body-md font-semibold text-brand-dark sm:text-body-lg"
              >
                Project Start
              </label>
              <input
                id="set-group-start"
                type="date"
                value={projectStart}
                onChange={(e) => {
                  setErrorMessage("");
                  setProjectStart(e.target.value);
                }}
                className={dateFieldClass}
              />

              <label
                htmlFor="set-group-end"
                className="text-body-md font-semibold text-brand-dark sm:text-body-lg"
              >
                Project End
              </label>
              <input
                id="set-group-end"
                type="date"
                value={projectEnd}
                onChange={(e) => {
                  setErrorMessage("");
                  setProjectEnd(e.target.value);
                }}
                className={dateFieldClass}
              />

              <label
                htmlFor="set-group-sprint"
                className="text-body-md font-semibold text-brand-dark sm:text-body-lg"
              >
                Sprint Length
              </label>
              <div className={fieldColumnClass}>
                <input
                  id="set-group-sprint"
                  type="number"
                  min={1}
                  max={3}
                  value={sprintLengthWeeks}
                  onChange={(e) => {
                    setErrorMessage("");
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 1 && n <= 3) {
                      setSprintLengthWeeks(n);
                    }
                  }}
                  className={`${dateFieldClass} w-24 text-center`}
                  aria-label="Sprint length in weeks"
                />
                <p className="mt-1 text-body-sm text-brand-dark/60">weeks</p>
              </div>
            </div>
          </GroupCard>

          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-md">
            <Button
              variant="grey"
              size="lg"
              href="/join-create-switch-group"
              className="min-h-11 w-full justify-center py-2.5 font-semibold sm:w-auto sm:px-7"
            >
              Back
            </Button>

            <Button
              size="lg"
              onClick={handleCreateGroup}
              disabled={isSubmitting}
              className="min-h-11 w-full justify-center py-2.5 font-semibold sm:w-auto sm:px-7 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SetGroupPage() {
  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-brand-background px-5 pb-4 pt-16 sm:px-8 sm:pb-5 sm:pt-20 md:px-12">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
        <header className="mb-5 flex shrink-0 flex-col items-center text-center sm:mb-6">
          <SprintHubTitle />
        </header>

        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <SetGroupContent />
        </Suspense>
      </div>
    </div>
  );
}
