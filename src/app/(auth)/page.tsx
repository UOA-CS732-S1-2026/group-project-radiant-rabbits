import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import SignInButton from "@/components/auth/SignInButton";
import LandingFeaturesSection from "@/components/landing-page/LandingFeaturesSection";
import LandingHowItWorksSection from "@/components/landing-page/LandingHowItWorksSection";
import { LANDING_HERO_SECTION_STACK } from "@/components/landing-page/landingStack";
import SprintHubTitle from "@/components/shared/SprintHubTitle";

export default async function LoginPage() {
  const session = await getServerSession(options);

  if (session) {
    redirect("/join-create-switch-group");
  }

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col items-stretch justify-start gap-16 sm:gap-20 md:gap-24">
      {/* Full-width row so children are block-level: mx-auto + max-w works (not flex items with margin:auto). */}
      <div className="w-full min-w-0">
        <section
          className={`mx-auto w-full min-w-0 max-w-3xl items-center text-center ${LANDING_HERO_SECTION_STACK}`}
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
            as="p"
            size="display"
            variant="gradient"
            className="text-center"
          />
          <h1
            id="landing-hero-heading"
            className="text-balance text-[2rem] font-extrabold leading-tight tracking-tight text-brand-dark sm:text-[2.25rem] md:text-[2.5rem]"
          >
            Sprint reviews that actually mean something
          </h1>
          <p className="mx-auto w-full min-w-0 max-w-2xl text-body-md leading-relaxed text-brand-dark/85 sm:text-body-lg">
            SprintHub connects to your GitHub repository and automatically
            generates data-driven sprint review reports, so your team can stop
            guessing and start improving.
          </p>
          <div className="flex justify-center">
            <SignInButton className="rounded-xl bg-brand-primary px-6 py-3 text-body-sm font-semibold text-brand-dark shadow-md transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark">
              Get started with GitHub
            </SignInButton>
          </div>
        </section>
      </div>

      <div className="w-full min-w-0">
        <LandingFeaturesSection />
      </div>

      <div className="w-full min-w-0">
        <LandingHowItWorksSection />
      </div>
    </div>
  );
}
