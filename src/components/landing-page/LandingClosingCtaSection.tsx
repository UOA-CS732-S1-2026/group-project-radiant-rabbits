import SignInButton from "@/components/auth/SignInButton";
import TestSignInButton from "@/components/auth/TestSignInButton";
import { LANDING_SIGN_IN_BUTTON_OUTLINE_ON_DARK_CLASS } from "@/components/landing-page/landingStack";

type LandingClosingCtaSectionProps = {
  className?: string;
};

/** Final sign-in prompt after features + how-it-works; compact solid navy card. */
export default function LandingClosingCtaSection({
  className = "",
}: LandingClosingCtaSectionProps) {
  const isTestMode = process.env.E2E_TEST_MODE === "true";

  return (
    <section
      className={`w-full min-w-0 ${className}`}
      aria-labelledby="landing-closing-cta-heading"
    >
      <div className="mx-auto w-full min-w-0 max-w-6xl">
        <article className="flex w-full min-w-0 flex-col rounded-xl border border-white/10 bg-brand-dark px-5 py-6 text-center shadow-md sm:rounded-2xl sm:px-6 sm:py-7">
          <div
            className="mx-auto h-2.5 w-14 shrink-0 rounded-md bg-brand-primary shadow-sm sm:h-3 sm:w-16"
            aria-hidden
          />
          <h2
            id="landing-closing-cta-heading"
            className="mt-3 w-full min-w-0 text-balance text-body-lg font-bold leading-snug text-white sm:mt-3.5 sm:text-h3"
          >
            Ready for sprint reviews tied to GitHub iterations?
          </h2>
          <div className="mt-5 flex w-full min-w-0 justify-center sm:mt-6">
            <SignInButton
              className={LANDING_SIGN_IN_BUTTON_OUTLINE_ON_DARK_CLASS}
            >
              Get started with GitHub
            </SignInButton>
            {isTestMode && (
              <>
                <p className="text-xs text-white/50">or</p>
                <TestSignInButton
                  className={LANDING_SIGN_IN_BUTTON_OUTLINE_ON_DARK_CLASS}
                >
                  Test Sign In
                </TestSignInButton>
                <p className="text-xs text-blue-300 mt-2">🧪 E2E Test Mode</p>
              </>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
