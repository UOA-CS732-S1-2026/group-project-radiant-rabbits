"use client";

import { RotateCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/shared/Avatar";
import BorderedPanel from "@/components/shared/BorderedPanel";

type Contributor = {
  name: string;
  initials: string;
  avatarUrl: string | null;
  commits: number;
  prs: number;
  issues: number;
};

type ContributionCardProps = {
  contributors: Contributor[];
  groupId?: string;
  sprintId?: string;
  className?: string;
};

type SummaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; text: string }
  | { status: "error"; message: string };

const initialState: SummaryState = { status: "idle" };

export default function ContributionCard({
  contributors,
  groupId,
  sprintId,
  className = "",
}: ContributionCardProps) {
  const aiEnabled = Boolean(groupId && sprintId);

  const [teamSummary, setTeamSummary] = useState<SummaryState>(initialState);
  const [contributorSummaries, setContributorSummaries] = useState<
    Record<string, SummaryState>
  >({});
  const [openContributor, setOpenContributor] = useState<string | null>(null);

  // Load cached team summary on mount; falls back to "empty" so the user can
  // explicitly trigger generation rather than spending tokens on every page view.
  useEffect(() => {
    if (!aiEnabled) return;
    let cancelled = false;

    (async () => {
      setTeamSummary({ status: "loading" });
      try {
        const res = await fetch(
          `/api/groups/${groupId}/sprints/${sprintId}/summary/team`,
        );
        if (cancelled) return;
        if (!res.ok) throw new Error("Failed to load summary");
        const data = (await res.json()) as { summary: string | null };
        setTeamSummary(
          data.summary
            ? { status: "ready", text: data.summary }
            : { status: "empty" },
        );
      } catch (error: unknown) {
        if (cancelled) return;
        setTeamSummary({
          status: "error",
          message:
            error instanceof Error ? error.message : "Failed to load summary",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [aiEnabled, groupId, sprintId]);

  const generateTeamSummary = useCallback(
    async (regenerate = false) => {
      if (!aiEnabled) return;
      setTeamSummary({ status: "loading" });
      try {
        const res = await fetch(
          `/api/groups/${groupId}/sprints/${sprintId}/summary/team`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ regenerate }),
          },
        );
        if (!res.ok) throw new Error("Failed to generate summary");
        const data = (await res.json()) as { summary: string };
        setTeamSummary({ status: "ready", text: data.summary });
      } catch (error: unknown) {
        setTeamSummary({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate summary",
        });
      }
    },
    [aiEnabled, groupId, sprintId],
  );

  const generateContributorSummary = useCallback(
    async (name: string, regenerate = false) => {
      if (!aiEnabled) return;
      setContributorSummaries((prev) => ({
        ...prev,
        [name]: { status: "loading" },
      }));
      try {
        const res = await fetch(
          `/api/groups/${groupId}/sprints/${sprintId}/summary/contributor`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contributor: name, regenerate }),
          },
        );
        if (!res.ok) throw new Error("Failed to generate summary");
        const data = (await res.json()) as { summary: string };
        setContributorSummaries((prev) => ({
          ...prev,
          [name]: { status: "ready", text: data.summary },
        }));
      } catch (error: unknown) {
        setContributorSummaries((prev) => ({
          ...prev,
          [name]: {
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to generate summary",
          },
        }));
      }
    },
    [aiEnabled, groupId, sprintId],
  );

  const handleToggleContributor = (name: string) => {
    if (openContributor === name) {
      setOpenContributor(null);
      return;
    }
    setOpenContributor(name);
    const existing = contributorSummaries[name];
    // Generate lazily per contributor so expanding the card does not trigger
    // AI work for every teammate at once.
    if (
      !existing ||
      existing.status === "idle" ||
      existing.status === "error"
    ) {
      generateContributorSummary(name);
    }
  };

  if (contributors.length === 0) {
    return (
      <BorderedPanel
        className={`flex h-full max-h-128 flex-col overflow-hidden p-md ${className}`}
      >
        <h4 className="text-(length:--text-body-lg) font-semibold text-brand-dark">
          Contribution · this sprint
        </h4>
        <p className="mt-xs text-(length:--text-body-xs) text-brand-dark/70">
          Total work this sprint, by person · click for AI summary
        </p>
        <p className="mt-md text-(length:--text-body-md) text-brand-dark/70">
          No contributor activity in this sprint period.
        </p>
      </BorderedPanel>
    );
  }

  return (
    <BorderedPanel
      className={`flex h-full max-h-128 flex-col overflow-hidden p-md ${className}`}
    >
      <div className="mb-md">
        <h4 className="text-(length:--text-body-lg) font-semibold text-brand-dark">
          Contribution · this sprint
        </h4>
        <p className="text-(length:--text-body-xs) text-brand-dark/70">
          Total work this sprint, by person · click for AI summary
        </p>
      </div>

      {aiEnabled ? (
        <TeamSummary
          state={teamSummary}
          onGenerate={() => generateTeamSummary(false)}
          onRegenerate={() => generateTeamSummary(true)}
        />
      ) : null}

      <div className="h-96 space-y-sm overflow-y-auto pr-xs">
        {contributors.map((person, index) => {
          const isOpen = openContributor === person.name;
          const summary = contributorSummaries[person.name] ?? initialState;
          return (
            <div
              key={person.name}
              className={
                index === 0 ? "" : "border-t border-brand-dark/10 pt-md"
              }
            >
              <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-md py-sm text-(length:--text-body-sm)">
                <Avatar
                  name={person.name}
                  initials={person.initials}
                  avatarUrl={person.avatarUrl}
                  size={32}
                />
                <div className="min-w-0">
                  <p className="truncate text-(length:--text-body-sm) font-medium text-brand-dark">
                    {person.name}
                  </p>
                  <p className="text-(length:--text-body-xs) text-brand-dark/70">
                    <span className="font-semibold">{person.commits}</span>{" "}
                    commits ·{" "}
                    <span className="font-semibold">{person.prs}</span> PRs ·{" "}
                    <span className="font-semibold">{person.issues}</span>{" "}
                    issues
                  </p>
                </div>
                {aiEnabled ? (
                  <button
                    type="button"
                    onClick={() => handleToggleContributor(person.name)}
                    aria-label={
                      isOpen
                        ? `Hide AI summary for ${person.name}`
                        : `Show AI summary for ${person.name}`
                    }
                    aria-expanded={isOpen}
                    className={`shrink-0 rounded-md p-1.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-accent-dark ${
                      isOpen
                        ? "bg-brand-accent/10 text-brand-accent-dark"
                        : "text-brand-dark/70 hover:bg-brand-dark/5 hover:text-brand-dark"
                    }`}
                  >
                    <Sparkles size={14} />
                  </button>
                ) : null}
              </div>
              {isOpen ? (
                <ContributorSummary
                  state={summary}
                  onRegenerate={() =>
                    generateContributorSummary(person.name, true)
                  }
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </BorderedPanel>
  );
}

function TeamSummary({
  state,
  onGenerate,
  onRegenerate,
}: {
  state: SummaryState;
  onGenerate: () => void;
  onRegenerate: () => void;
}) {
  if (state.status === "loading") {
    return (
      <div className="mb-md rounded-lg bg-brand-accent/5 p-sm">
        <SummarySkeleton />
      </div>
    );
  }

  if (state.status === "ready") {
    return (
      <div className="mb-md flex items-start gap-sm rounded-lg bg-brand-accent/5 p-sm">
        <Sparkles
          size={14}
          className="mt-0.5 shrink-0 text-brand-accent-dark"
        />
        <p className="flex-1 text-(length:--text-body-sm) leading-relaxed text-brand-dark">
          {state.text}
        </p>
        <button
          type="button"
          onClick={onRegenerate}
          aria-label="Regenerate AI summary"
          className="shrink-0 rounded-md p-1 text-brand-dark/40 transition hover:bg-brand-dark/5 hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-accent-dark"
        >
          <RotateCw size={12} />
        </button>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mb-md flex items-start gap-sm rounded-lg bg-brand-todo/10 p-sm">
        <p className="flex-1 text-(length:--text-body-md) text-brand-dark/70">
          Couldn&apos;t load summary. {state.message}
        </p>
        <button
          type="button"
          onClick={onGenerate}
          className="shrink-0 text-(length:--text-body-md) font-medium text-brand-accent-dark hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-accent-dark rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mb-md flex items-center gap-sm rounded-lg border border-dashed border-brand-dark/15 p-sm">
      <Sparkles size={14} className="shrink-0 text-brand-accent-dark" />
      <p className="flex-1 text-(length:--text-body-md) text-brand-dark/70">
        Get an AI summary of how the team contributed this sprint.
      </p>
      <button
        type="button"
        onClick={onGenerate}
        className="shrink-0 rounded-md bg-brand-accent-dark px-sm py-1 text-(length:--text-body-sm) font-medium text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent-dark"
      >
        Generate
      </button>
    </div>
  );
}

function ContributorSummary({
  state,
  onRegenerate,
}: {
  state: SummaryState;
  onRegenerate: () => void;
}) {
  return (
    <div className="mb-sm rounded-md bg-brand-accent/5 p-sm">
      {state.status === "loading" ? (
        <SummarySkeleton />
      ) : state.status === "error" ? (
        <div className="flex items-center justify-between gap-sm">
          <p className="text-brand-dark/70 text-(length:--text-body-sm)">
            Couldn&apos;t generate summary.
          </p>
          <button
            type="button"
            onClick={onRegenerate}
            className="text-(length:--text-body-sm) font-medium text-brand-accent-dark hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-accent-dark rounded"
          >
            Retry
          </button>
        </div>
      ) : state.status === "ready" ? (
        <div className="flex items-start gap-sm">
          <p className="flex-1 text-(length:--text-body-sm) leading-relaxed text-brand-dark">
            {state.text}
          </p>
          <button
            type="button"
            onClick={onRegenerate}
            aria-label="Regenerate"
            className="shrink-0 rounded-md p-1 text-brand-dark/40 transition hover:bg-brand-dark/5 hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-accent-dark"
          >
            <RotateCw size={12} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <output className="block space-y-1.5" aria-label="Loading summary">
      <div className="h-3 w-full animate-pulse rounded bg-brand-dark/10" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-brand-dark/10" />
    </output>
  );
}
