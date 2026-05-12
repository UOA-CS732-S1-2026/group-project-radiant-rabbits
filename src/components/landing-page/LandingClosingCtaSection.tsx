import SignInButton from "@/components/auth/SignInButton";
import { LANDING_SIGN_IN_BUTTON_OUTLINE_ON_DARK_CLASS } from "@/components/landing-page/landingStack";

type LandingClosingCtaSectionProps = {
  className?: string;
};

/** Final sign-in prompt after features + how-it-works; compact solid navy card. */
export default function LandingClosingCtaSection({
  className = "",
}: LandingClosingCtaSectionProps) {
  return (
    <section
      className={`w-full min-w-0 ${className}`}
      aria-labelledby="landing-closing-cta-heading"
    >
      <div className="mx-auto w-full min-w-0 max-w-6xl">
        <article className="flex w-full min-w-0 flex-col rounded-xl border border-brand-border bg-brand-border/15 px-5 py-6 text-center shadow-md sm:rounded-2xl sm:px-6 sm:py-7">
          <div
            className="mx-auto h-2.5 w-14 shrink-0 rounded-md bg-brand-accent shadow-sm sm:h-3 sm:w-16"
            aria-hidden
          />
          <h2
            id="landing-closing-cta-heading"
            className="mt-3 w-full min-w-0 text-balance text-(length:--text-body-lg) font-bold leading-snug text-black sm:mt-3.5 sm:text-h3"
          >
            Ready for sprint reviews tied to GitHub iterations?
          </h2>
          <p className="mt-2 w-full min-w-0 text-pretty text-(length:--text-body-md) font-normal leading-snug text-black sm:mt-2.5 sm:leading-snug">
            Sign in with GitHub, connect a repo, and pull your sprint story
            together in minutes.
          </p>
          <div className="mt-5 flex w-full min-w-0 justify-center sm:mt-6">
            <SignInButton
              className={LANDING_SIGN_IN_BUTTON_OUTLINE_ON_DARK_CLASS}
            >
              Get started with GitHub
            </SignInButton>
          </div>
        </article>
      </div>
    </section>
  );
}
