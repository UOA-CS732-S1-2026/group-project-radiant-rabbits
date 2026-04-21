"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import BorderedPanel from "@/components/shared/BorderedPanel";
import Card from "@/components/shared/Card";
import PageContainer from "@/components/shared/PageContainer";
import SectionHeading from "@/components/shared/SectionHeading";

type Teammate = {
  id: string;
  name: string;
  login: string | null;
  email: string | null;
  avatarUrl: string | null;
};

type CurrentGroup = {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  repoOwner: string;
  repoName: string;
  memberCount: number;
};

type TeammatesResponse = {
  group: CurrentGroup | null;
  members: Teammate[];
  error?: string;
};

const REFRESH_INTERVAL_MS = 30_000;

// Build initials when no avatar image is available.
function getInitials(name: string) {
  const tokens = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (tokens.length === 0) {
    return "?";
  }

  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("");
}

export default function TeammatesPage() {
  // Teammates API state.
  const [group, setGroup] = useState<CurrentGroup | null>(null);
  const [members, setMembers] = useState<Teammate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch current group and member profiles.
  const fetchTeammates = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      setIsLoading(true);
    }

    try {
      const response = await fetch("/api/user/group-members", {
        cache: "no-store",
      });
      const data = (await response.json()) as TeammatesResponse;

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch teammates");
      }

      setGroup(data.group);
      setMembers(data.members);
      setErrorMessage(null);
    } catch (error) {
      const fallbackMessage = "Unable to load teammates right now.";
      setErrorMessage(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Initial load.
    fetchTeammates();

    // Poll for membership changes.
    const intervalId = window.setInterval(() => {
      fetchTeammates({ silent: true });
    }, REFRESH_INTERVAL_MS);

    // Refresh after user returns to tab.
    const handleFocus = () => {
      fetchTeammates({ silent: true });
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchTeammates]);

  // Small context line under the page title.
  const groupSubtitle = useMemo(() => {
    if (!group) {
      return "Join or create a group to start collaborating with teammates.";
    }

    return `${group.repoOwner}/${group.repoName} · ${group.memberCount} member${
      group.memberCount === 1 ? "" : "s"
    }`;
  }, [group]);

  return (
    <PageContainer>
      <SectionHeading title="Teammates" subtitle={groupSubtitle} />

      <Card className="border border-brand-dark/10 border-l-0 shadow-none">
        <BorderedPanel className="p-0">
          <div className="border-b border-brand-dark/10 px-lg py-lg">
            <h2 className="text-h3 font-semibold text-brand-dark">
              Team Members
            </h2>
            {group ? (
              <p className="mt-1 text-body-sm text-brand-dark/70">
                {group.name}
              </p>
            ) : null}
          </div>

          <div className="px-lg py-md">
            {isLoading && (
              <p className="text-body-md text-brand-dark/70">
                Loading teammates...
              </p>
            )}

            {!isLoading && errorMessage && (
              <p className="rounded-md bg-red-100 px-md py-sm text-body-sm text-red-700">
                {errorMessage}
              </p>
            )}

            {!isLoading && !errorMessage && !group && (
              <p className="text-body-md text-brand-dark/70">
                You are not in a group yet. Join or create a group to view
                teammates.
              </p>
            )}

            {!isLoading && !errorMessage && group && members.length === 0 && (
              <p className="text-body-md text-brand-dark/70">
                No teammates found in this group yet.
              </p>
            )}

            {!isLoading && !errorMessage && group && members.length > 0 && (
              <div className="space-y-md">
                {members.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between gap-md border-b border-brand-dark/10 pb-md"
                  >
                    <div className="flex items-center gap-md">
                      {person.avatarUrl ? (
                        <Image
                          src={person.avatarUrl}
                          alt={`${person.name} avatar`}
                          width={56}
                          height={56}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-accent/20 text-body-md font-semibold text-brand-dark">
                          {getInitials(person.name)}
                        </div>
                      )}

                      <div>
                        <p className="text-body-lg font-semibold text-brand-dark">
                          {person.name}
                        </p>
                        {person.login && (
                          <p className="text-body-sm text-brand-dark/70">
                            @{person.login}
                          </p>
                        )}
                      </div>
                    </div>

                    {person.email ? (
                      <p className="hidden text-body-sm text-brand-dark/70 md:block">
                        {person.email}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </BorderedPanel>
      </Card>
    </PageContainer>
  );
}
