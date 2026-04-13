"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SignInButton from "@/components/auth/SignInButton";
import BorderedPanel from "@/components/ui/BorderedPanel";
import GroupCard from "@/components/ui/GroupCard";
import SegmentedControl from "@/components/ui/SegmentedControl";
import SprintHubTitle from "@/components/ui/SprintHubTitle";

const TAB_OPTIONS = [
  { id: "join", label: "Join a Group" },
  { id: "create", label: "Create a Group" },
  { id: "current", label: "Current Groups" },
] as const;

type GroupListCard = {
  _id?: string;
  name: string;
  repoOwner: string;
  inviteCode?: string;
};

export default function JoinCreateSwitchGroupPage() {
  const router = useRouter();
  const [tab, setTab] = useState<string>("join");

  const [lists, setLists] = useState({
    current: [] as GroupListCard[],
    join: [] as GroupListCard[],
    create: [] as GroupListCard[],
  });

  const [isFetching, setIsFetching] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthError, setIsAuthError] = useState(false);

  useEffect(() => {
    async function fetchCardData() {
      try {
        setIsFetching(true);
        const response = await fetch("/api/user/groups");
        const data = await response.json();

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

        setLists({
          current: data.currentGroups,
          join: data.joinGroups,
          create: data.createGroups,
        });
      } catch (error) {
        console.error("Error fetching groups:", error);
        setErrorMessage("An unexpected error occurred while fetching groups.");
      } finally {
        setIsFetching(false);
      }
    }

    fetchCardData();
  }, []);

  const handleCardClick = async (card: GroupListCard) => {
    setErrorMessage("");
    setIsAuthError(false);

    if (tab === "current") {
      if (!card._id) {
        setErrorMessage("Missing group id for selected group.");
        return;
      }

      setIsActionLoading(true);

      try {
        const response = await fetch("/api/user/current-group", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: card._id }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to switch current group");
        }

        router.push("/dashboard");
      } catch (error: any) {
        setErrorMessage(error.message);
      } finally {
        setIsActionLoading(false);
      }

      return;
    }

    setIsActionLoading(true);

    try {
      if (tab === "join") {
        const response = await fetch("/api/groups/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteCode: card.inviteCode }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) setIsAuthError(true);
          throw new Error(data.error || "Failed to join group");
        }

        router.push("/dashboard");
        return;
      }

      if (tab === "create") {
        router.push(
          `/set-group?repoName=${card.name}&repoOwner=${card.repoOwner}`,
        );
        return;
      }
    } catch (error: any) {
      setErrorMessage(error.message);
      if (
        error.message?.toLowerCase().includes("authentication") ||
        error.message?.toLowerCase().includes("token")
      ) {
        setIsAuthError(true);
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const cards = lists[tab as keyof typeof lists];

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-brand-background px-5 pb-4 pt-16 sm:px-8 sm:pb-5 sm:pt-20 md:px-12">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
        <header className="mb-6 shrink-0 text-center sm:mb-8">
          <SprintHubTitle />
        </header>

        {errorMessage && (
          <div className="mx-auto mb-4 flex w-full flex-col items-center justify-center gap-3 rounded-md bg-red-100 p-4 text-center text-red-700 sm:mb-5">
            <p className="font-medium">{errorMessage}</p>
            {isAuthError && <SignInButton />}
          </div>
        )}

        <SegmentedControl
          className="mx-auto mb-4 shrink-0 sm:mb-5"
          options={TAB_OPTIONS}
          value={tab}
          onChange={setTab}
        />

        <BorderedPanel className="w-full shrink-0 overflow-hidden p-4 sm:p-5 md:p-6">
          {isFetching && (
            <p className="text-center text-gray-500">
              Loading your repositories...
            </p>
          )}
          {isActionLoading && (
            <p className="text-center text-brand-accent">
              Processing your request...
            </p>
          )}

          {!isFetching && (!cards || cards.length === 0) && (
            <p className="text-center text-gray-500">
              No repositories available for this tab.
            </p>
          )}

          {!isFetching && cards && cards.length > 0 && (
            <div className="scrollbar-thumb-accent max-h-[calc(100dvh-19rem)] overflow-y-auto pr-1 sm:max-h-[calc(100dvh-23rem)] sm:pr-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
                {cards.map((card) => (
                  <button
                    type="button"
                    key={`${tab}-${card._id ?? card.name}-${card.repoOwner}`}
                    onClick={() => handleCardClick(card)}
                    disabled={isActionLoading}
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
