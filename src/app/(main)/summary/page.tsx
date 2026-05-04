"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import PageContainer from "@/components/shared/PageContainer";
import SectionHeading from "@/components/shared/SectionHeading";

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

  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
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
  }, []);

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
  }, [selectedGroupId]);

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

  async function requestReview(regenerate: boolean) {
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
          typeof payload.generatedAt === "string" ? payload.generatedAt : null,
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
  }

  return (
    <PageContainer>
      <SectionHeading
        title="Sprint Review Summary"
        subtitle="Generate and review AI-powered sprint highlights for a selected sprint."
      />

      {errorMessage && (
        <section className="mb-lg rounded-xl border border-red-200 bg-red-50 px-md py-sm text-body-sm text-red-700">
          {errorMessage}
        </section>
      )}

      <section className="mb-lg">
        <Card>
          <div className="grid gap-md md:grid-cols-2">
            <label className="flex flex-col gap-xs text-body-sm text-brand-dark/80">
              Group
              <select
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                disabled={isLoadingGroups || isGenerating}
                className="rounded-xl border border-brand-dark/15 bg-white px-sm py-sm text-body-sm text-brand-dark"
              >
                {groups.length === 0 && (
                  <option value="">No groups available</option>
                )}
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name ?? "Unnamed group"}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-xs text-body-sm text-brand-dark/80">
              Sprint
              <select
                value={selectedSprintId}
                onChange={(event) => setSelectedSprintId(event.target.value)}
                disabled={
                  isLoadingSprints ||
                  isLoadingGroups ||
                  !selectedGroupId ||
                  isGenerating
                }
                className="rounded-xl border border-brand-dark/15 bg-white px-sm py-sm text-body-sm text-brand-dark"
              >
                {sprints.length === 0 && (
                  <option value="">No sprints available</option>
                )}
                {sprints.map((sprint) => (
                  <option key={sprint._id} value={sprint._id}>
                    {sprint.name ?? "Unnamed sprint"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-md flex flex-wrap items-center gap-sm">
            <Button
              onClick={() => requestReview(false)}
              disabled={
                isGenerating ||
                isLoadingGroups ||
                isLoadingSprints ||
                !selectedGroupId ||
                !selectedSprintId
              }
            >
              {isGenerating ? "Generating..." : "Generate Sprint Review"}
            </Button>

            <Button
              variant="white"
              onClick={() => requestReview(true)}
              disabled={
                isGenerating ||
                isLoadingGroups ||
                isLoadingSprints ||
                !selectedGroupId ||
                !selectedSprintId
              }
            >
              Regenerate
            </Button>
          </div>
        </Card>
      </section>

      <section>
        <Card>
          <div className="flex flex-col gap-sm">
            <h2 className="text-h3 text-brand-dark">Generated Sprint Review</h2>

            <p className="text-body-sm text-brand-dark/70">
              {selectedGroup?.name ?? "No group selected"}
              {selectedGroup?.repoOwner ? ` (${selectedGroup.repoOwner})` : ""}
              {selectedSprint
                ? ` • ${selectedSprint.name ?? "Unnamed sprint"} (${formatDateRange(selectedSprint.startDate, selectedSprint.endDate)})`
                : ""}
            </p>

            <p className="text-body-xs text-brand-dark/60">
              Last generated: {formatGeneratedAt(reviewMeta.generatedAt)}
              {reviewMeta.provider ? ` • Provider: ${reviewMeta.provider}` : ""}
              {reviewMeta.model ? ` • Model: ${reviewMeta.model}` : ""}
            </p>
          </div>

          <div className="mt-md rounded-xl border border-brand-dark/10 bg-brand-background p-md">
            {isLoadingReview ? (
              <p className="text-body-sm text-brand-dark/70">
                Loading review...
              </p>
            ) : review ? (
              <pre className="whitespace-pre-wrap text-body-sm text-brand-dark/80">
                {review}
              </pre>
            ) : (
              <p className="text-body-sm text-brand-dark/70">
                No sprint review has been generated yet for this sprint.
              </p>
            )}
          </div>
        </Card>
      </section>
    </PageContainer>
  );
}
