"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HelpOverlayTrigger from "@/components/shared/HelpOverlayTrigger";
import PageContainer from "@/components/shared/PageContainer";

type GroupSummaryOption = {
  id?: string;
  name?: string | null;
  repoOwner?: string | null;
};

type SprintSummaryOption = {
  _id: string;
  name?: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
};

type SprintReviewMetadata = {
  generatedAt: string | null;
  model: string | null;
  provider: string | null;
};

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Unknown sprint dates";
  }

  return `${start.toLocaleDateString(undefined, { timeZone: "UTC" })} - ${end.toLocaleDateString(undefined, { timeZone: "UTC" })}`;
}

function formatGeneratedAt(value: string | null): string {
  if (!value) {
    return "Not generated yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not generated yet";
  }

  return date.toLocaleString();
}

async function parseJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(fallbackMessage);
  }

  return (await response.json()) as T;
}

export default function SummaryPage() {
  const searchParams = useSearchParams();
  const queryGroupId = searchParams.get("groupId") ?? "";
  const querySprintId = searchParams.get("sprintId") ?? "";
  const shouldAutoGenerate = searchParams.get("autoGenerate") === "1";
  const autoGenerateAttemptedRef = useRef("");
  const [groups, setGroups] = useState<GroupSummaryOption[]>([]);
  const [sprints, setSprints] = useState<SprintSummaryOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [review, setReview] = useState("");
  const [reviewMeta, setReviewMeta] = useState<SprintReviewMetadata>({
    generatedAt: null,
    model: null,
    provider: null,
  });
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingSprints, setIsLoadingSprints] = useState(false);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId),
    [groups, selectedGroupId],
  );

  const selectedSprint = useMemo(
    () => sprints.find((sprint) => sprint._id === selectedSprintId),
    [sprints, selectedSprintId],
  );

  useEffect(() => {
    async function fetchGroups() {
      setIsLoadingGroups(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/user/groups");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load groups");
        }

        const nextGroups = (payload.currentGroups ??
          []) as GroupSummaryOption[];
        setGroups(nextGroups);

        const persistedGroupId = window.localStorage.getItem("selectedGroupId");
        const preferredGroup =
          nextGroups.find((group) => group.id === queryGroupId) ??
          nextGroups.find((group) => group.id === persistedGroupId) ??
          nextGroups[0];

        setSelectedGroupId(preferredGroup?.id ?? "");
      } catch (error) {
        console.error("Error loading groups:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load groups",
        );
      } finally {
        setIsLoadingGroups(false);
      }
    }

    fetchGroups();
  }, [queryGroupId]);

  useEffect(() => {
    if (!selectedGroupId) {
      setSprints([]);
      setSelectedSprintId("");
      return;
    }

    window.localStorage.setItem("selectedGroupId", selectedGroupId);

    async function fetchSprints() {
      setIsLoadingSprints(true);
      setErrorMessage("");
      setReview("");
      setReviewMeta({ generatedAt: null, model: null, provider: null });

      try {
        const response = await fetch(
          `/api/groups/${selectedGroupId}/sprints?limit=50`,
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load sprints");
        }

        const nextSprints = (payload ?? []) as SprintSummaryOption[];
        setSprints(nextSprints);

        setSelectedSprintId((previous) => {
          if (
            querySprintId &&
            nextSprints.some((sprint) => sprint._id === querySprintId)
          ) {
            return querySprintId;
          }

          if (
            previous &&
            nextSprints.some((sprint) => sprint._id === previous)
          ) {
            return previous;
          }

          const defaultSprint =
            nextSprints.find((sprint) => sprint.isCurrent) ?? nextSprints[0];

          return defaultSprint?._id ?? "";
        });
      } catch (error) {
        console.error("Error loading sprints:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load sprints",
        );
        setSprints([]);
        setSelectedSprintId("");
      } finally {
        setIsLoadingSprints(false);
      }
    }

    fetchSprints();
  }, [querySprintId, selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId || !selectedSprintId) {
      setReview("");
      setReviewMeta({ generatedAt: null, model: null, provider: null });
      return;
    }

    const activeSprint = sprints.find(
      (sprint) => sprint._id === selectedSprintId,
    );

    if (!activeSprint) {
      setReview("");
      setReviewMeta({ generatedAt: null, model: null, provider: null });
      if (sprints.length > 0) {
        setErrorMessage("Selected sprint no longer exists.");
      }
      return;
    }

    let cancelled = false;

    async function fetchPersistedReview() {
      setIsLoadingReview(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          `/api/groups/${selectedGroupId}/sprints/${selectedSprintId}`,
        );
        const payload = await parseJsonResponse<{
          aiReview?: {
            text?: unknown;
            generatedAt?: unknown;
            model?: unknown;
            provider?: unknown;
          };
          error?: string;
        }>(response, "Failed to load sprint details");

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load sprint details");
        }

        if (cancelled) {
          return;
        }

        const persistedReview =
          typeof payload.aiReview?.text === "string"
            ? payload.aiReview.text
            : "";

        setReview(persistedReview);
        setReviewMeta({
          generatedAt:
            typeof payload.aiReview?.generatedAt === "string"
              ? payload.aiReview.generatedAt
              : null,
          model:
            typeof payload.aiReview?.model === "string"
              ? payload.aiReview.model
              : null,
          provider:
            typeof payload.aiReview?.provider === "string"
              ? payload.aiReview.provider
              : null,
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading sprint review:", error);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to load sprint review",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingReview(false);
        }
      }
    }

    fetchPersistedReview();

    return () => {
      cancelled = true;
    };
  }, [selectedGroupId, selectedSprintId, sprints]);

  const requestReview = useCallback(
    async (regenerate: boolean) => {
      if (!selectedGroupId || !selectedSprintId) {
        return;
      }

      const activeSprint = sprints.find(
        (sprint) => sprint._id === selectedSprintId,
      );

      if (!activeSprint) {
        setErrorMessage("Selected sprint no longer exists.");
        return;
      }

      setIsGenerating(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          `/api/groups/${selectedGroupId}/sprints/${selectedSprintId}/review`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ regenerate }),
          },
        );

        const payload = await parseJsonResponse<{
          review?: unknown;
          generatedAt?: unknown;
          model?: unknown;
          provider?: unknown;
          error?: string;
        }>(response, "Failed to generate sprint review");

        if (!response.ok) {
          throw new Error(payload.error || "Failed to generate sprint review");
        }

        setReview(typeof payload.review === "string" ? payload.review : "");
        setReviewMeta({
          generatedAt:
            typeof payload.generatedAt === "string"
              ? payload.generatedAt
              : null,
          model: typeof payload.model === "string" ? payload.model : null,
          provider:
            typeof payload.provider === "string" ? payload.provider : null,
        });
      } catch (error) {
        console.error("Error generating sprint review:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to generate sprint review",
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [selectedGroupId, selectedSprintId, sprints],
  );

  useEffect(() => {
    if (
      !shouldAutoGenerate ||
      isLoadingReview ||
      isGenerating ||
      review ||
      !selectedGroupId ||
      !selectedSprintId
    ) {
      return;
    }

    const activeSprint = sprints.find(
      (sprint) => sprint._id === selectedSprintId,
    );

    if (!activeSprint) {
      return;
    }

    const autoGenerateKey = `${selectedGroupId}:${selectedSprintId}`;
    if (autoGenerateAttemptedRef.current === autoGenerateKey) {
      return;
    }

    autoGenerateAttemptedRef.current = autoGenerateKey;
    requestReview(false);
  }, [
    isGenerating,
    isLoadingReview,
    requestReview,
    review,
    selectedGroupId,
    selectedSprintId,
    shouldAutoGenerate,
    sprints,
  ]);

  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <div className="space-y-lg">
          <div className="flex items-start justify-between gap-md border-b border-brand-dark/10 pb-lg">
            <div>
              <h1 className="text-(length:--text-h2) font-bold text-brand-dark">
                Sprint Review Summary
              </h1>
              <p className="mt-xs text-(length:--text-body-xs) font-semibold uppercase tracking-[0.14em] text-brand-accent">
                {selectedSprint?.name ?? "No sprint selected"}
              </p>
            </div>
            <HelpOverlayTrigger
              label="Help: sprint review summary"
              title="AI sprint review"
              className="shrink-0 self-start pt-0.5"
            >
              <div className="space-y-3 text-left">
                <p>
                  This page shows a{" "}
                  <span className="font-semibold">generated narrative</span> of
                  the sprint, built from your synced GitHub activity. It is
                  stored per sprint so your team can read it again later.
                </p>
              </div>
            </HelpOverlayTrigger>
          </div>

          <section>
            <div className="flex flex-col gap-xs">
              <h2 className="text-(length:--text-body-lg) font-semibold text-brand-dark">
                Generated Sprint Review
              </h2>

              <p className="text-(length:--text-body-sm) text-brand-dark/60">
                {selectedGroup?.name ?? "No group selected"}
                {selectedGroup?.repoOwner
                  ? ` (${selectedGroup.repoOwner})`
                  : ""}
                {selectedSprint
                  ? ` • ${selectedSprint.name ?? "Unnamed sprint"} (${formatDateRange(selectedSprint.startDate, selectedSprint.endDate)})`
                  : ""}
              </p>

              <p className="text-(length:--text-body-xs) text-brand-dark/60">
                Last generated: {formatGeneratedAt(reviewMeta.generatedAt)}
                {reviewMeta.provider
                  ? ` • Provider: ${reviewMeta.provider}`
                  : ""}
                {reviewMeta.model ? ` • Model: ${reviewMeta.model}` : ""}
              </p>
            </div>

            <div className="mt-md border-t border-brand-dark/10 pt-md">
              {isLoadingGroups || isLoadingSprints || isLoadingReview ? (
                <p className="text-(length:--text-body-md) text-brand-dark/70">
                  Loading review...
                </p>
              ) : isGenerating ? (
                <p className="text-(length:--text-body-md) text-brand-dark/70">
                  Generating sprint review...
                </p>
              ) : errorMessage ? (
                <p className="text-(length:--text-body-md) text-red-700">
                  {errorMessage}
                </p>
              ) : review ? (
                <pre className="whitespace-pre-wrap font-sans text-(length:--text-body-sm) text-brand-dark/70">
                  {review}
                </pre>
              ) : (
                <p className="text-(length:--text-body-md) text-brand-dark/70">
                  No sprint review has been generated yet for this sprint.
                </p>
              )}
            </div>
          </section>
        </div>
      </PageContainer>
    </div>
  );
}
