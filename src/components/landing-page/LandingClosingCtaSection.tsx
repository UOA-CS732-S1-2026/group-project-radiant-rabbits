import SignInButton from "@/components/auth/SignInButton";

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
          <SignInButton className="mt-5 rounded-xl border-2 border-white bg-transparent px-5 py-2.5 text-body-sm font-semibold text-white transition hover:bg-white/15 active:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:mt-6 sm:px-6 sm:py-3">
            Get started with GitHub
          </SignInButton>
        </div>
      </div>
    </section>
  );
}
