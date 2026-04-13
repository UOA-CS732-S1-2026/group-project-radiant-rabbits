import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import SignInButton from "@/components/auth/SignInButton";
import LandingFeaturesSection from "@/components/landing-page/LandingFeaturesSection";
import LandingHowItWorksSection from "@/components/landing-page/LandingHowItWorksSection";
import {
  LANDING_HERO_LEAD_TEXT_CLASS,
  LANDING_HERO_SECTION_STACK,
} from "@/components/landing-page/landingStack";
import SprintHubTitle from "@/components/shared/SprintHubTitle";

export default async function LoginPage() {
  const session = await getServerSession(options);

  if (session) {
    redirect("/join-create-switch-group");
  }

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col items-stretch justify-start gap-20 sm:gap-24 md:gap-28">
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
            id="landing-hero-heading"
            as="h1"
            size="display"
            variant="gradient"
            className="text-center"
          />
          <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col items-center gap-5 rounded-2xl border border-slate-200/90 bg-slate-100 px-5 py-5 sm:gap-6 sm:px-7 sm:py-6">
            <p className={`text-pretty ${LANDING_HERO_LEAD_TEXT_CLASS}`}>
              SprintHub connects to your GitHub repository and automatically
              generates data-driven sprint review reports, so your team can stop
              guessing and start improving.
            </p>
            <SignInButton className="rounded-xl bg-brand-primary px-6 py-3 text-body-sm font-semibold text-brand-dark shadow-md transition hover:brightness-105 active:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark">
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
