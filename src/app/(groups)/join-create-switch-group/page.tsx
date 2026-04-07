"use client";

import Link from "next/link";
import { useState } from "react";
import BorderedPanel from "@/components/ui/BorderedPanel";
import GroupCard from "@/components/ui/GroupCard";
import SegmentedControl from "@/components/ui/SegmentedControl";
import SprintHubTitle from "@/components/ui/SprintHubTitle";

const TAB_OPTIONS = [
  { id: "join", label: "Join a Group" },
  { id: "create", label: "Create a Group" },
  { id: "current", label: "Current Groups" },
] as const;

const DUMMY_CARDS: Record<
  (typeof TAB_OPTIONS)[number]["id"],
  readonly string[]
> = {
  join: [
    "group-project-radiant-rabbits",
    "sprint-hub-project",
    "team-alpha-project",
    "team-beta-project",
    "team-gamma-project",
    "team-delta-project",
    "team-epsilon-project",
    "team-zeta-project",
    "team-eta-project",
    "team-theta-project",
    "team-iota-project",
    "team-kappa-project",
    "team-lambda-project",
    "team-mu-project",
    "team-nu-project",
  ],
  create: ["Team a", "Team b", "Team c", "Team d"],
  current: ["UOA-CS732 / radiant-rabbits (you)", "Study group · design review"],
};

export default function JoinCreateSwitchGroupPage() {
  const [tab, setTab] = useState<string>("join");
  const cards =
    DUMMY_CARDS[tab as keyof typeof DUMMY_CARDS] ?? DUMMY_CARDS.join;

  return (
    <div className="min-h-screen bg-brand-background px-6 pb-10 pt-20">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-10 text-center">
          <SprintHubTitle />
        </header>

        <SegmentedControl
          className="mx-auto mb-6"
          options={TAB_OPTIONS}
          value={tab}
          onChange={setTab}
        />

        <BorderedPanel className="p-lg">
          <div className="scrollbar-thumb-accent max-h-[min(50vh,28rem)] overflow-y-auto pr-sm">
            <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
              {cards.map((line) => (
                <Link
                  key={`${tab}-${line}`}
                  href={tab === "create" ? "/set-group" : "/dashboard"}
                  className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                >
                  <GroupCard className="cursor-pointer transition-colors duration-150 hover:bg-slate-200">
                    <p className="text-center text-body-md font-medium text-brand-dark">
                      {line}
                    </p>
                  </GroupCard>
                </Link>
              ))}
            </div>
          </div>
        </BorderedPanel>
      </div>
    </div>
  );
}
