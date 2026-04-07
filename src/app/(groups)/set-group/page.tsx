"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import GroupCard from "@/components/ui/GroupCard";
import SprintHubTitle from "@/components/ui/SprintHubTitle";

const fieldColumnClass =
  "w-full max-w-[14rem] min-w-0 justify-self-start sm:max-w-[13rem]";

const dateFieldClass = `${fieldColumnClass} rounded-lg border border-brand-accent/50 bg-brand-surface px-sm py-1.5 text-body-sm leading-tight text-brand-dark shadow-sm outline-none transition-shadow [color-scheme:light] focus:ring-2 focus:ring-brand-primary`;

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

export default function SetGroupPage() {
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

  return (
    <div className="min-h-screen bg-brand-background px-6 pb-10 pt-20">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 flex flex-col items-center text-center">
          <SprintHubTitle />
          <Button
            variant="blue-help"
            shape="pill"
            className="mt-4 shrink-0"
            aria-label="Help"
          >
            ?
          </Button>
        </header>

        <div className="flex justify-center p-lg pt-0">
          <div className="flex w-full max-w-full min-w-0 flex-col items-stretch gap-lg sm:w-fit">
            <GroupCard>
              <div className="grid w-full min-w-0 grid-cols-1 gap-y-2 sm:grid-cols-[11rem_auto] sm:items-center sm:gap-x-6 sm:gap-y-4">
                <label
                  htmlFor="set-group-start"
                  className="text-body-md font-semibold text-brand-dark"
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
                  className="text-body-md font-semibold text-brand-dark"
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
                  className="text-body-md font-semibold text-brand-dark"
                >
                  Sprint Length
                </label>
                <div
                  className={`grid min-w-0 grid-cols-2 overflow-hidden rounded-lg border border-brand-accent/50 bg-brand-surface shadow-sm focus-within:ring-2 focus-within:ring-brand-primary ${fieldColumnClass}`}
                >
                  <div className="flex min-h-0 min-w-0 items-center justify-center border-r border-brand-accent/30 py-1.5">
                    <input
                      id="set-group-sprint"
                      type="number"
                      min={1}
                      value={sprintLength}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isNaN(n) && n >= 1) setSprintLength(n);
                      }}
                      className="w-full min-w-0 border-0 bg-transparent text-center text-body-sm text-brand-dark outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      aria-label="Sprint length amount"
                    />
                  </div>
                  <button
                    type="button"
                    className="flex min-h-0 min-w-0 cursor-pointer select-none items-center justify-center border-0 py-1.5 text-body-sm text-brand-dark/75 transition-colors hover:bg-brand-accent/15 active:bg-brand-accent/25"
                    onClick={() =>
                      setSprintLengthUnit((u) => nextSprintUnit(u))
                    }
                    aria-label={`Unit: ${sprintLengthUnit}. Click to switch between days, weeks, and months.`}
                  >
                    {sprintLengthUnit}
                  </button>
                </div>
              </div>
            </GroupCard>

            <div className="flex w-full items-center justify-between gap-md">
              <Button
                variant="grey"
                href="/join-create-switch-group"
                className="py-2.5 text-body-md"
              >
                Back
              </Button>
              <Button href="/dashboard" className="py-2.5 text-body-md">
                Create Group
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
