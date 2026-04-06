import Button from "@/components/ui/Button";

type PageTopBarProps = {
  repoName: string;
  pageLabel: string;
  profileImageUrl?: string;
};

export default function PageTopBar({
  repoName,
  pageLabel,
  profileImageUrl,
}: PageTopBarProps) {
  return (
    <header className="border-b border-brand-dark/10 bg-brand-surface">
      <div className="flex items-center justify-between px-lg py-sm">
        {/* Left: Repo name */}
        <h1 className="text-body-lg font-semibold text-brand-dark">
          {repoName}
        </h1>

        {/* Right: Button + Avatar */}
        <div className="flex items-center gap-md">
          {/* Use design system button (no hardcoded color) */}
          <Button>Generate Sprint Review</Button>

          {/* Avatar */}
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt="GitHub profile"
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent/60 text-body-sm font-medium text-brand-dark shadow-md">
              ✶
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
