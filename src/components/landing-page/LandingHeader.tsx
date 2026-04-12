import SignInButton from "@/components/auth/SignInButton";
import AppLogoMark from "@/components/shared/AppLogoMark";
import SprintHubTitle from "@/components/shared/SprintHubTitle";

export default function LandingHeader() {
  return (
    <header
      className="w-full px-4 py-3 shadow-sm sm:px-6 sm:py-4"
      style={{
        background: "linear-gradient(to right, #7BB8FF, #B8A9FE)",
      }}
    >
      <div className="flex w-full min-w-0 items-center justify-between gap-3 sm:gap-4">
        <a
          href="/landing-page"
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

        <SignInButton className="shrink-0 rounded-lg border border-brand-dark/25 bg-white px-3 py-2 text-xs font-semibold text-brand-dark shadow-sm transition hover:bg-brand-background hover:border-brand-dark/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark sm:px-4 sm:py-2.5 sm:text-body-sm" />
      </div>
    </header>
  );
}
