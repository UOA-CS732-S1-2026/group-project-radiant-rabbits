import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import LandingClosingCtaSection from "@/components/landing-page/LandingClosingCtaSection";
import LandingFeaturesSection from "@/components/landing-page/LandingFeaturesSection";
import LandingHeroSection from "@/components/landing-page/LandingHeroSection";
import LandingHowItWorksSection from "@/components/landing-page/LandingHowItWorksSection";

export default async function LoginPage() {
  const session = await getServerSession(options);
  const isTestMode = process.env.TEST_MODE === "true";

  if (session) {
    // Test mode skips the group-selection dependency so smoke tests land on a
    // deterministic authenticated page with fixture data.
    redirect(isTestMode ? "/dashboard" : "/join-create-switch-group");
  }

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col items-stretch justify-start gap-20 sm:gap-24 md:gap-28">
      {/* Keep each landing section in a block wrapper so section-level max-width
          rules behave consistently outside a flex item context. */}
      <div className="w-full min-w-0">
        <LandingHeroSection />
      </div>

      <div className="w-full min-w-0">
        <LandingFeaturesSection />
      </div>

      <div className="w-full min-w-0">
        <LandingHowItWorksSection />
      </div>

      <div className="w-full min-w-0">
        <LandingClosingCtaSection />
      </div>
    </div>
  );
}
