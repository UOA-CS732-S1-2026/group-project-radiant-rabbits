import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import LandingClosingCtaSection from "@/components/landing-page/LandingClosingCtaSection";
import LandingFeaturesSection from "@/components/landing-page/LandingFeaturesSection";
import LandingHeroSection from "@/components/landing-page/LandingHeroSection";
import LandingHowItWorksSection from "@/components/landing-page/LandingHowItWorksSection";

export default async function LoginPage() {
  const session = await getServerSession(options);

  if (session) {
    redirect("/join-create-switch-group");
  }

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col items-stretch justify-start gap-20 sm:gap-24 md:gap-28">
      {/* Full-width row so children are block-level: mx-auto + max-w works (not flex items with margin:auto). */}
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
