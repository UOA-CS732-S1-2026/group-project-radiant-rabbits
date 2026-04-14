import Image from "next/image";
import Button from "@/components/shared/Button";

type PageTopBarProps = {
  repoName: string;
  pageLabel: string;
  profileImageUrl?: string;
  profileName?: string;
};

export default function PageTopBar({
  repoName,
  pageLabel,
  profileImageUrl,
  profileName,
}: PageTopBarProps) {
  const fallbackInitial = profileName?.trim().charAt(0).toUpperCase() ?? "?";

  return (
    <header className="border-b border-brand-dark/10 bg-brand-surface">
      <div className="flex items-center justify-between px-lg py-sm">
        {/* Left: Repo name */}
        <div>
          <h1 className="text-body-lg font-semibold text-brand-dark">
            {repoName}
          </h1>
          <p className="text-body-sm text-brand-dark/70">{pageLabel}</p>
        </div>

        {/* Right: Button + Avatar */}
        <div className="flex items-center gap-md">
          {/* Use design system button (no hardcoded color) */}
          <Button size="lg">Generate Sprint Review</Button>

          {/* Avatar */}
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
