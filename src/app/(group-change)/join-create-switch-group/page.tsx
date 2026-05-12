"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import SignInButton from "@/components/auth/SignInButton";
import GroupCard from "@/components/group-change/GroupCard";
import BorderedPanel from "@/components/shared/BorderedPanel";
import Button from "@/components/shared/Button";
import SegmentedControl from "@/components/shared/SegmentedControl";
import SprintHubTitle from "@/components/shared/SprintHubTitle";
import { safeDashboardReturn } from "@/lib/safeDashboardReturn";

const TAB_OPTIONS = [
  { id: "join", label: "Join a Group" },
  { id: "create", label: "Create a Group" },
  { id: "current", label: "Your Groups" },
] as const;
const CURRENT_GROUP_FILTER_OPTIONS = [
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
] as const;

type GroupListCard = {
  id: string;
  name: string;
  repoOwner: string;
  inviteCode?: string;
  active?: boolean;
};

function JoinCreateSwitchGroupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dashboardReturn = useMemo(
    () => safeDashboardReturn(searchParams.get("returnTo")),
    [searchParams],
  );

  const [tab, setTab] = useState<string>("join");
  const [currentGroupFilter, setCurrentGroupFilter] =
    useState<string>("active");

  // State to hold the lists of groups for each tab
  const [lists, setLists] = useState({
    current: [] as GroupListCard[],
    join: [] as GroupListCard[],
    create: [] as GroupListCard[],
  });

  // States to manage loading and error states for fetching groups
  const [isFetching, setIsFetching] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthError, setIsAuthError] = useState(false);

  // Fetch the groups for the user on page load
  useEffect(() => {
    async function fetchCardData() {
      try {
        // Call API route to fetch the user's groups and accessible repositories
        setIsFetching(true);
        const response = await fetch("/api/user/groups");
        const data = await response.json();

        // Handle authentication errors
        if (!response.ok) {
          if (response.status === 401) {
            setIsAuthError(true);
            setErrorMessage(
              "Authentication required. Please sign in with GitHub.",
            );
          } else {
            setErrorMessage(data.error || "Failed to fetch groups");
          }
          return;
        }

        // Define card lists for each tab
        setLists({
          current: data.currentGroups,
          join: data.joinGroups,
          create: data.createGroups,
        });
      } catch (error) {
        // Handle unexpected errors
        console.error("Error fetching groups:", error);
        setErrorMessage("An unexpected error occurred while fetching groups.");
      } finally {
        setIsFetching(false);
      }
    }
    // Call the function to fetch group data
    fetchCardData();
  }, []);

  // Handle card click based on the active tab
  const handleCardClick = async (card: GroupListCard) => {
    // Reset any errors before event handling
    setErrorMessage("");
    setIsAuthError(false);

    if (tab === "current") {
      if (card.active === false) {
        router.push(`/group-history/${card.id}`);
        return;
      }
      setIsActionLoading(true);

      try {
        const response = await fetch("/api/groups/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: card.id }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) setIsAuthError(true);
          throw new Error(data.error || "Failed to switch group.");
        }

        router.push("/dashboard");
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong.",
        );
      } finally {
        setIsActionLoading(false);
      }

      return;
    }

    // Turn on the loading state so the user knows something is happening
    setIsActionLoading(true);

    try {
      // Call the POST "/api/groups/join" route if the user is trying to join a group
      if (tab === "join") {
        // We use POST to send data to the backend
        const response = await fetch("/api/groups/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteCode: card.inviteCode }),
        });

        // Standard error checking pattern
        if (!response.ok) {
          if (response.status === 401) setIsAuthError(true);
          const errorData = await response.json();
          throw new Error(errorData.error);
        }

        // Send user to the dashboard on success
        router.push("/dashboard");
      }

      // If the user clicks on a card in the "Create Groups" tab, we need to create a new group and then navigate them to the set-group page to finish setup
      if (tab === "create") {
        const q = new URLSearchParams({
          repoName: card.name,
          repoOwner: card.repoOwner,
        });
        if (dashboardReturn) q.set("returnTo", dashboardReturn);
        router.push(`/set-group?${q.toString()}`);
        return;
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      setErrorMessage(message);
      const lower = message.toLowerCase();
      if (lower.includes("authentication") || lower.includes("token")) {
        setIsAuthError(true);
      }
    } finally {
      // Turn off the loading state, whether it succeeded or failed
      setIsActionLoading(false);
    }
  };

  const cards = lists[tab as keyof typeof lists];
  const displayCards =
    tab === "current"
      ? cards.filter((card) =>
          currentGroupFilter === "active"
            ? card.active !== false
            : card.active === false,
        )
      : cards;

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-brand-background px-5 pb-4 pt-16 sm:px-8 sm:pb-5 sm:pt-20 md:px-12">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
        <header className="mb-6 shrink-0 text-center sm:mb-8">
          <SprintHubTitle />
        </header>

        {/* Error banner for redirection if any errors occur */}
        {errorMessage && (
          <div className="mx-auto mb-4 flex w-full flex-col items-center justify-center gap-3 rounded-md bg-red-100 p-4 text-center text-red-700 sm:mb-5">
            <p className="font-medium">{errorMessage}</p>
            {isAuthError && <SignInButton />}
          </div>
        )}

        {dashboardReturn ? (
          <div className="mb-4 grid w-full min-w-0 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 sm:mb-5 sm:gap-x-3">
            <div className="flex min-w-0 justify-self-start">
              <Button
                variant="grey"
                size="sm"
                href={dashboardReturn}
                className="shrink-0 whitespace-nowrap px-3 py-2 font-semibold sm:px-4"
              >
                Back to dashboard
              </Button>
            </div>
            <div className="flex justify-center justify-self-center">
              <SegmentedControl
                options={TAB_OPTIONS}
                value={tab}
                onChange={setTab}
              />
            </div>
            <div className="min-w-0" aria-hidden="true" />
          </div>
        ) : (
          <div className="mb-4 flex w-full shrink-0 justify-center sm:mb-5">
            <SegmentedControl
              options={TAB_OPTIONS}
              value={tab}
              onChange={setTab}
            />
          </div>
        )}

        <BorderedPanel className="w-full shrink-0 overflow-hidden p-4 sm:p-5 md:p-6">
          {tab === "current" ? (
            <div className="mb-4 flex justify-center">
              <SegmentedControl
                options={CURRENT_GROUP_FILTER_OPTIONS}
                value={currentGroupFilter}
                onChange={setCurrentGroupFilter}
              />
            </div>
          ) : null}
          {/* Display for loading and empty states */}
          {isFetching && (
            <p className="text-center text-gray-500">
              Loading your repositories...
            </p>
          )}
          {isActionLoading && (
            <p className="mb-4 text-center text-brand-accent">
              Processing your request...
            </p>
          )}

          {!isFetching && (!displayCards || displayCards.length === 0) && (
            <p className="text-center text-gray-500">
              No repositories available for this tab.
            </p>
          )}

          {/* Displaying the repo/group cards */}
          {!isFetching && displayCards && displayCards.length > 0 && (
            <div className="scrollbar-thumb-accent max-h-[calc(100dvh-19rem)] overflow-y-auto pr-1 sm:max-h-[calc(100dvh-23rem)] sm:pr-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
                {displayCards.map((card) => (
                  // Button that uses card click handler to either join the group or start the group creation process, depending on the active tab.
                  <button
                    type="button"
                    key={card.id}
                    onClick={() => handleCardClick(card)}
                    disabled={isActionLoading}
                    className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                  >
                    <GroupCard
                      className={`cursor-pointer transition-colors duration-150 ${
                        tab === "current" && card.active === false
                          ? "bg-slate-200"
                          : "hover:bg-slate-200"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1 text-center sm:gap-1.5">
                        <p className="text-(length:--text-body-md) font-semibold leading-snug text-brand-dark">
                          {card.name}
                        </p>
                        <p className="text-(length:--text-body-sm) leading-snug text-[#7A7A7A]">
                          {card.repoOwner}
                        </p>
                        {tab === "current" && card.active === false ? (
                          <span className="mt-1 rounded-full bg-slate-500 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                            Archived
                          </span>
                        ) : null}
                      </div>
                    </GroupCard>
                  </button>
                ))}
              </div>
            </div>
          )}
        </BorderedPanel>
      </div>
    </div>
  );
}

export default function JoinCreateSwitchGroupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-brand-background px-5 text-(length:--text-body-md) text-brand-dark/70">
          Loading…
        </div>
      }
    >
      <JoinCreateSwitchGroupContent />
    </Suspense>
  );
}
