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

function SetGroupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const repoName = searchParams.get("repoName");
  const repoOwner = searchParams.get("repoOwner");
  // Only allow same-app dashboard returns so a crafted setup link cannot turn
  // the Back button into an open redirect.
  const joinPickerHref = joinCreateSwitchGroupHref(
    safeDashboardReturn(searchParams.get("returnTo")),
  );

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
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoOwner,
          repoName,
          description: `Group for ${repoOwner}/${repoName}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create group.");
      }

      // Group creation also makes the new group current on the server, so the
      // dashboard can immediately render against that selection.
      router.push("/dashboard");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create group.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col justify-start px-0 pt-0 sm:px-lg">
        <div className="flex w-full max-w-full min-w-0 flex-col items-stretch gap-4 sm:mx-auto sm:w-fit sm:gap-5">
          {errorMessage && (
            <div className="rounded-md bg-red-100 p-3 text-center text-(length:--text-body-sm) text-red-700">
              {errorMessage}
            </div>
          )}

          <GroupCard>
            <div className="flex w-full min-w-0 flex-col gap-md text-(length:--text-body-md) text-brand-dark sm:gap-lg">
              <p>
                You&apos;re about to create a group for{" "}
                <span className="font-semibold">
                  {repoOwner && repoName
                    ? `${repoOwner}/${repoName}`
                    : "this repository"}
                </span>
                .
              </p>
              <p className="text-brand-dark/70">
                Sprints, dates, and ticket assignments are pulled from the{" "}
                <span className="font-semibold text-brand-dark">
                  iteration field
                </span>{" "}
                on your GitHub Project. Set those up there, then refresh from
                the dashboard whenever you want the latest data.
              </p>
            </div>
          </GroupCard>

          <div className="flex w-full flex-row flex-wrap items-center justify-between gap-3 sm:gap-md">
            <Button
              variant="grey"
              size="lg"
              href={joinPickerHref}
              className="min-h-11 shrink-0 justify-center py-2.5 font-semibold sm:px-7"
            >
              Back
            </Button>

            <Button
              size="lg"
              onClick={handleCreateGroup}
              disabled={isSubmitting}
              className="min-h-11 shrink-0 justify-center py-2.5 font-semibold sm:px-7 disabled:opacity-50"
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
            label="Help: GitHub project and sprints"
            title="Sprints and your GitHub Project"
            size="comfortable"
          >
            <div className="space-y-4 text-left">
              <p>
                Sprint dates and which issues belong to each sprint come from
                your linked{" "}
                <span className="font-semibold">GitHub Project</span>— there are
                no sprint dates to type in here.
              </p>
              <p>
                Configure an{" "}
                <span className="font-semibold text-brand-dark">
                  iteration field
                </span>{" "}
                on the project (often named &ldquo;Sprint&rdquo;), assign issues
                to the right iteration, then click{" "}
                <span className="font-semibold text-brand-dark">
                  Create Group
                </span>{" "}
                to create the group and run the first sync.
              </p>
            </div>
          </HelpOverlayTrigger>
        </div>

        {/* useSearchParams requires a suspense boundary in app-router client
            pages, even though this screen is otherwise fully client-rendered. */}
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <SetGroupContent />
        </Suspense>
      </div>
    </div>
  );
}
