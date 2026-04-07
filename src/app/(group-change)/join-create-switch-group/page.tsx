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

/** Repo / group title with optional owner line (join + current tabs). */
type GroupListCard =
  | { name: string; repoOwner: string }
  | { name: string; repoOwner?: undefined };

const DUMMY_CARDS: Record<
  (typeof TAB_OPTIONS)[number]["id"],
  readonly GroupListCard[]
> = {
  join: [
    {
      name: "group-project-radiant-rabbits",
      repoOwner: "UOA-CS732-S1-2026",
    },
    { name: "sprint-hub-project", repoOwner: "cs732-course-org" },
    { name: "team-alpha-project", repoOwner: "alpha-devs" },
    { name: "team-beta-project", repoOwner: "beta-labs" },
    { name: "team-gamma-project", repoOwner: "gamma-studio" },
    { name: "team-delta-project", repoOwner: "delta-build" },
    { name: "team-epsilon-project", repoOwner: "epsilon-eng" },
    { name: "team-zeta-project", repoOwner: "zeta-team" },
    { name: "team-eta-project", repoOwner: "eta-org" },
    { name: "team-theta-project", repoOwner: "theta-collab" },
    { name: "team-iota-project", repoOwner: "iota-github" },
    { name: "team-kappa-project", repoOwner: "kappa-class" },
    { name: "team-lambda-project", repoOwner: "lambda-group" },
    { name: "team-mu-project", repoOwner: "mu-org" },
    { name: "team-nu-project", repoOwner: "nu-research" },
  ],
  create: [
    { name: "Team a" },
    { name: "Team b" },
    { name: "Team c" },
    { name: "Team d" },
  ],
  current: [
    {
      name: "UOA-CS732 / radiant-rabbits (you)",
      repoOwner: "UOA-CS732-S1-2026",
    },
    {
      name: "Study group · design review",
      repoOwner: "design-guild-uoa",
    },
  ],
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
              {cards.map((card) => (
                <Link
                  key={`${tab}-${card.name}-${"repoOwner" in card ? card.repoOwner : "create"}`}
                  href={tab === "create" ? "/set-group" : "/dashboard"}
                  className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                >
                  <GroupCard className="cursor-pointer transition-colors duration-150 hover:bg-slate-200">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <p className="text-body-md font-medium text-brand-dark">
                        {card.name}
                      </p>
                      {"repoOwner" in card ? (
                        <p className="text-body-sm leading-tight text-[#7A7A7A]">
                          {card.repoOwner}
                        </p>
                      ) : null}
                    </div>
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
