"use client";

import Link from "next/link";
import { useState } from "react";
import GroupCard from "@/components/group-change/GroupCard";
import BorderedPanel from "@/components/shared/BorderedPanel";
import SegmentedControl from "@/components/shared/SegmentedControl";
import SprintHubTitle from "@/components/shared/SprintHubTitle";

const TAB_OPTIONS = [
  { id: "join", label: "Join a Group" },
  { id: "create", label: "Create a Group" },
  { id: "current", label: "Current Groups" },
] as const;

type GroupListCard = { name: string; repoOwner: string };

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
    { name: "Team a", repoOwner: "UOA-CS732-S1-2026" },
    { name: "Team b", repoOwner: "cs732-course-org" },
    { name: "Team c", repoOwner: "study-group-uoa" },
    { name: "Team d", repoOwner: "radiant-rabbits-class" },
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
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-brand-background px-5 pb-4 pt-16 sm:px-8 sm:pb-5 sm:pt-20 md:px-12">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
        <header className="mb-6 shrink-0 text-center sm:mb-8">
          <SprintHubTitle />
        </header>

        <SegmentedControl
          className="mx-auto mb-4 shrink-0 sm:mb-5"
          options={TAB_OPTIONS}
          value={tab}
          onChange={setTab}
        />

        <BorderedPanel className="w-full shrink-0 overflow-hidden p-4 sm:p-5 md:p-6">
          <div className="scrollbar-thumb-accent max-h-[calc(100dvh-19rem)] overflow-y-auto pr-1 sm:max-h-[calc(100dvh-23rem)] sm:pr-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
              {cards.map((card) => (
                <Link
                  key={`${tab}-${card.name}-${card.repoOwner}`}
                  href={tab === "create" ? "/set-group" : "/dashboard"}
                  className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                >
                  <GroupCard className="cursor-pointer transition-colors duration-150 hover:bg-slate-200">
                    <div className="flex flex-col items-center gap-1 text-center sm:gap-1.5">
                      <p className="text-body-md font-semibold leading-snug text-brand-dark sm:text-body-lg">
                        {card.name}
                      </p>
                      <p className="text-body-sm leading-snug text-[#7A7A7A] sm:text-body-md">
                        {card.repoOwner}
                      </p>
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
