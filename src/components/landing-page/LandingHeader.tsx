import SignInButton from "@/components/auth/SignInButton";
import AppLogoMark from "@/components/landing-page/AppLogoMark";
import SprintHubTitle from "@/components/shared/SprintHubTitle";

type LandingHeaderProps = {
  /** Set false on `/` when the page shows its own sign-in control. */
  showSignInButton?: boolean;
};

export default function LandingHeader({
  showSignInButton = true,
}: LandingHeaderProps) {
  return (
    <header className="w-full bg-gradient-to-r from-brand-primary to-brand-accent px-4 py-1.5 shadow-sm sm:px-6 sm:py-2">
      <div
        className={`flex w-full min-w-0 items-center gap-2 sm:gap-3 ${showSignInButton ? "justify-between" : "justify-start"}`}
      >
        <a
          href="/"
          className="flex min-w-0 flex-1 items-center justify-start gap-2 sm:gap-3"
        >
          <AppLogoMark className="h-10 w-10 sm:h-11 sm:w-11" />
          <SprintHubTitle
            as="span"
            size="md"
            variant="white"
            className="min-w-0 truncate"
          />
        </a>

        {showSignInButton ? (
          <SignInButton className="shrink-0 rounded-lg border border-brand-dark/25 bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark shadow-sm transition hover:brightness-[0.97] active:brightness-[0.9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark sm:px-4 sm:py-2 sm:text-body-sm" />
        ) : null}
      </div>
    </header>
  );
}
