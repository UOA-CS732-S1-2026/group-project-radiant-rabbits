"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import Button from "@/components/shared/Button";

type PageTopBarProps = {
  repoName: string;
  profileImageUrl?: string;
  profileName?: string;
};

const pageLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/current-sprint": "Current Sprint",
  "/past-sprints": "Past Sprints",
  "/teammates": "Teammates",
  "/sprint-settings": "Sprint Settings",
  "/join-create-switch-group": "Change Group",
};

// Helper function to resolve page label based on pathname
function resolvePageLabel(pathname: string | null): string {
  if (!pathname) return "";

  if (pageLabels[pathname]) return pageLabels[pathname];

  const match = Object.keys(pageLabels).find((key) => pathname.startsWith(key));

  return match ? pageLabels[match] : "";
}

export default function PageTopBar({
  repoName,
  profileImageUrl,
  profileName,
}: PageTopBarProps) {
  const pathname = usePathname();
  const pageLabel = resolvePageLabel(pathname);
  const fallbackInitial = profileName?.trim().charAt(0).toUpperCase() ?? "?";

  return (
    <header className="border-b border-brand-dark/10 bg-brand-surface">
      <div className="flex items-center justify-between px-lg py-sm">
        {/* Left: group name / current tab*/}
        <h1 className="flex items-baseline gap-xs text-body-lg font-semibold">
          <span className="text-brand-dark/50">{repoName}</span>
          {pageLabel ? (
            <>
              <span className="text-brand-dark/40">/</span>
              <span className="text-brand-dark">{pageLabel}</span>
            </>
          ) : null}
        </h1>

        {/* Right: button + avatar */}
        <div className="flex items-center gap-md">
          {/* Button for generating spint review */}
          <Button size="lg">Generate Sprint Review</Button>

          {/* Avatar with fallback to initial */}
          {profileImageUrl ? (
            <Image
              src={profileImageUrl}
              alt={`${profileName ?? "GitHub"} profile`}
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent/60 text-body-sm font-medium text-brand-dark shadow-md">
              {fallbackInitial}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
