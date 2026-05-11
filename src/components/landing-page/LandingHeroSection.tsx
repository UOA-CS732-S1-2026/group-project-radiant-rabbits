import SignInButton from "@/components/auth/SignInButton";
import {
  LANDING_HERO_LEAD_TEXT_CLASS,
  LANDING_HERO_SECTION_STACK,
  LANDING_SIGN_IN_BUTTON_PRIMARY_CLASS,
} from "@/components/landing-page/landingStack";
import SprintHubTitle from "@/components/shared/SprintHubTitle";

type LandingHeroSectionProps = {
  className?: string;
};

export default function LandingHeroSection({
  className = "",
}: LandingHeroSectionProps) {
  return (
    <section
      className={`mx-auto w-full min-w-0 max-w-3xl items-center text-center ${LANDING_HERO_SECTION_STACK} ${className}`}
      aria-labelledby="landing-hero-heading"
    >
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent px-3 py-1.5 text-body-xs font-semibold uppercase tracking-widest text-brand-dark">
          <span aria-hidden className="text-brand-dark/50">
            •
          </span>
          Your agile coach
        </span>
      </div>
      <SprintHubTitle
        id="landing-hero-heading"
        as="h1"
        size="display"
        variant="gradient"
        className="text-center"
      />
      <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col items-center gap-5 rounded-2xl border border-slate-200/90 bg-slate-100 px-5 py-5 sm:gap-6 sm:px-7 sm:py-6">
        <p className={`text-pretty ${LANDING_HERO_LEAD_TEXT_CLASS}`}>
          SprintHub connects to GitHub and syncs your repository. Your{" "}
          <span className="font-semibold text-brand-dark">GitHub Project</span>{" "}
          <span className="font-semibold text-brand-dark">iteration field</span>{" "}
          sets each sprint so board items, commits, and PRs all share the same
          windows. Sprint views make progress easy to read with less guesswork.
        </p>
        <SignInButton className={LANDING_SIGN_IN_BUTTON_PRIMARY_CLASS}>
          Get started with GitHub
        </SignInButton>
      </div>
    </section>
  );
}
