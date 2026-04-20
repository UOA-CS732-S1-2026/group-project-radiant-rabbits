"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import GroupCard from "@/components/group-change/GroupCard";
import Button from "@/components/shared/Button";
import HelpOverlayTrigger from "@/components/shared/HelpOverlayTrigger";
import SprintHubTitle from "@/components/shared/SprintHubTitle";
import {
  joinCreateSwitchGroupHref,
  safeDashboardReturn,
} from "@/lib/safeDashboardReturn";

const fieldColumnClass =
  "w-full max-w-[18rem] min-w-0 justify-self-start sm:max-w-[17rem]";

const dateFieldClass = `${fieldColumnClass} min-h-12 rounded-lg border border-brand-accent/50 bg-brand-surface px-md py-2 text-body-md leading-tight text-brand-dark shadow-sm outline-none transition-shadow [color-scheme:light] focus:ring-2 focus:ring-brand-primary sm:min-h-[3.25rem]`;

const SPRINT_UNITS = ["days", "weeks", "months"] as const;
type SprintLengthUnit = (typeof SPRINT_UNITS)[number];

function nextSprintUnit(current: SprintLengthUnit): SprintLengthUnit {
  const i = SPRINT_UNITS.indexOf(current);
  return SPRINT_UNITS[(i + 1) % SPRINT_UNITS.length];
}

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

  // Get parameters from groups page
  const repoName = searchParams.get("repoName");
  const repoOwner = searchParams.get("repoOwner");
  const joinPickerHref = joinCreateSwitchGroupHref(
    safeDashboardReturn(searchParams.get("returnTo")),
  );

  const [projectStart, setProjectStart] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [projectEnd, setProjectEnd] = useState(() => {
    const today = new Date();
    return toDateInputValue(addCalendarMonths(today, 2));
  });
  const [sprintLength, setSprintLength] = useState(7);
  const [sprintLengthUnit, setSprintLengthUnit] =
    useState<SprintLengthUnit>("days");

  // States for the API call to create the group and error handling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCreateGroup = async () => {
    if (!repoName || !repoOwner) {
      setErrorMessage(
        "Missing repository information. Please go back and select a repository again.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // Calling POST /api/groups to create the group with the selected repository and default description.
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoOwner: repoOwner,
          repoName: repoName,
          description: `Group for ${repoOwner}/${repoName}`,
          // Add Sprint details here once added to model
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create group.");
      }

      // Redirect to empty dashboard for created group
      router.push("/dashboard");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col justify-start px-0 pt-0 sm:px-lg">
        <div className="flex w-full max-w-full min-w-0 flex-col items-stretch gap-4 sm:mx-auto sm:w-fit sm:gap-5">
          {/* Display an errors from group creation API*/}
          {errorMessage && (
            <div className="rounded-md bg-red-100 p-3 text-sm text-red-700 text-center">
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
                onChange={(e) => setProjectStart(e.target.value)}
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
                onChange={(e) => setProjectEnd(e.target.value)}
                className={dateFieldClass}
              />

              <label
                htmlFor="set-group-sprint"
                className="text-body-md font-semibold text-brand-dark sm:text-body-lg"
              >
                Sprint Length
              </label>
              <div
                className={`grid min-h-12 min-w-0 grid-cols-2 overflow-hidden rounded-lg border border-brand-accent/50 bg-brand-surface shadow-sm focus-within:ring-2 focus-within:ring-brand-primary sm:min-h-[3.25rem] ${fieldColumnClass}`}
              >
                <div className="flex min-h-0 min-w-0 items-center justify-center border-r border-brand-accent/30 py-1.5 sm:py-2">
                  <input
                    id="set-group-sprint"
                    type="number"
                    min={1}
                    value={sprintLength}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isNaN(n) && n >= 1) setSprintLength(n);
                    }}
                    className="w-full min-w-0 border-0 bg-transparent text-center text-body-md text-brand-dark outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    aria-label="Sprint length amount"
                  />
                </div>
                <button
                  type="button"
                  className="flex min-h-0 min-w-0 cursor-pointer select-none items-center justify-center border-0 py-1.5 text-body-md text-brand-dark/75 transition-colors hover:bg-brand-accent/15 active:bg-brand-accent/25 sm:py-2"
                  onClick={() => setSprintLengthUnit((u) => nextSprintUnit(u))}
                  aria-label={`Unit: ${sprintLengthUnit}. Click to switch between days, weeks, and months.`}
                >
                  {sprintLengthUnit}
                </button>
              </div>
            </div>
          </GroupCard>

          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-md">
            <Button
              variant="grey"
              size="lg"
              href={joinPickerHref}
              className="min-h-11 w-full justify-center py-2.5 font-semibold sm:w-auto sm:px-7"
            >
              Back
            </Button>

            {/* Changed from href link to a button that triggers the API call */}
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

        <div className="mb-4 flex shrink-0 justify-center sm:mb-5">
          <HelpOverlayTrigger
            label="Help for finishing group setup"
            title="Creating your group"
            size="comfortable"
          >
            <div className="space-y-4 text-left">
              <p>
                <span className="font-semibold text-brand-dark">
                  Project start and end
                </span>{" "}
                are the dates your project is meant to run between; together
                they define the overall schedule you’re capturing when you
                create this group.
              </p>
              <p>
                <span className="font-semibold text-brand-dark">
                  Sprint length
                </span>{" "}
                is how long one sprint should last: enter the amount, then tap
                the unit to cycle between days, weeks, and months so the cadence
                matches how your team wants to slice work into iterations.
              </p>
            </div>
          </HelpOverlayTrigger>
        </div>

        {/* Suspense is required by Next.js when using useSearchParams */}
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <SetGroupContent />
        </Suspense>
      </div>
    </div>
  );
}
