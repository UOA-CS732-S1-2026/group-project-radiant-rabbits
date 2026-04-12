import SignInButton from "@/components/auth/SignInButton";
import AppLogoMark from "@/components/shared/AppLogoMark";
import SprintHubTitle from "@/components/shared/SprintHubTitle";

type LandingHeaderProps = {
  /** Set false on `/` when the page shows its own sign-in control. */
  showSignInButton?: boolean;
};

export default function LandingHeader({
  showSignInButton = true,
}: LandingHeaderProps) {
  return (
    <header
      className="w-full px-4 py-2.5 shadow-sm sm:px-6 sm:py-2.5"
      style={{
        background: "linear-gradient(to right, #7BB8FF, #B8A9FE)",
      }}
    >
      <div
        className={`flex w-full min-w-0 items-center gap-3 sm:gap-4 ${showSignInButton ? "justify-between" : "justify-start"}`}
      >
        <a
          href="/"
          className="flex min-w-0 flex-1 items-center justify-start gap-2 sm:gap-3"
        >
          <AppLogoMark className="h-9 w-9 sm:h-10 sm:w-10" />
          <SprintHubTitle
            as="span"
            size="md"
            variant="white"
            className="min-w-0 truncate"
          />
        </a>

        {showSignInButton ? (
          <SignInButton className="shrink-0 rounded-lg border border-brand-dark/25 bg-white px-3 py-2 text-xs font-semibold text-brand-dark shadow-sm transition hover:bg-brand-background hover:border-brand-dark/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark sm:px-4 sm:py-2.5 sm:text-body-sm" />
        ) : null}
      </div>
    </header>
  );
}
