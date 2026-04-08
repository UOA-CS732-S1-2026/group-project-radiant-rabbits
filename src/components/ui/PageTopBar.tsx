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
        <div>
          <h1 className="text-xl font-semibold leading-tight text-brand-dark">
            {repoName}
          </h1>
          <p className="sr-only">{pageLabel}</p>
        </div>

        {/* Right: Button + Avatar */}
        <div className="flex items-center gap-md">
          {/* Use design system button (no hardcoded color) */}
          <Button size="lg">Generate Sprint Review</Button>

          {/* Avatar */}
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt="GitHub profile"
              className="h-11 w-11 rounded-xl object-cover shadow-md sm:h-12 sm:w-12"
            />
          ) : (
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent/60 text-body-md font-medium leading-none text-brand-dark shadow-md sm:h-12 sm:w-12 sm:text-body-lg"
              aria-hidden
            >
              ✶
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
