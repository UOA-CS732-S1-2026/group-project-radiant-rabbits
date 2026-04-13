import SignInButton from "@/components/auth/SignInButton";
import { LANDING_SIGN_IN_BUTTON_OUTLINE_ON_DARK_CLASS } from "@/components/landing-page/landingStack";

type LandingClosingCtaSectionProps = {
  className?: string;
};

/** Final sign-in prompt after features + how-it-works — compact solid navy card. */
export default function LandingClosingCtaSection({
  className = "",
}: LandingClosingCtaSectionProps) {
  return (
    <section
      className={`w-full min-w-0 ${className}`}
      aria-labelledby="landing-closing-cta-heading"
    >
      <div className="mx-auto flex w-full max-w-2xl justify-center">
        <div className="w-full rounded-xl border border-white/10 bg-brand-dark px-5 py-6 text-center shadow-md sm:rounded-2xl sm:px-6 sm:py-7">
          <div
            className="mx-auto h-2.5 w-14 shrink-0 rounded-md bg-brand-primary shadow-sm sm:h-3 sm:w-16"
            aria-hidden
          />
          <h2
            id="landing-closing-cta-heading"
            className="mt-3 text-balance text-body-lg font-bold leading-snug text-white sm:mt-3.5 sm:text-h3"
          >
            Ready for a retrospective that writes itself?
          </h2>
          <p className="mt-2 text-pretty text-body-md font-normal leading-snug text-white sm:mt-2.5 sm:text-body-lg sm:leading-snug">
            Sign in with GitHub, connect a repo, and pull your sprint story
            together in minutes.
          </p>
          <SignInButton
            className={`mt-5 sm:mt-6 ${LANDING_SIGN_IN_BUTTON_OUTLINE_ON_DARK_CLASS}`}
          >
            Get started with GitHub
          </SignInButton>
        </div>
      </div>
    </section>
  );
}
