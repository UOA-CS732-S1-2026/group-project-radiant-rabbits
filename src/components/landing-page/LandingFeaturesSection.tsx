import LandingFeatureCard from "@/components/landing-page/LandingFeatureCard";
import LandingSectionHeading from "@/components/landing-page/LandingSectionHeading";
import { LANDING_FEATURES } from "@/components/landing-page/landingFeatures";
import {
  LANDING_FEATURE_GRID_GAP,
  LANDING_SECTION_STACK,
} from "@/components/landing-page/landingStack";

type LandingFeaturesSectionProps = {
  className?: string;
};

/**
 * Flex wrap + justify-center: 1 → 2 → 3 columns by width; incomplete last rows stay centered.
 */
export default function LandingFeaturesSection({
  className = "",
}: LandingFeaturesSectionProps) {
  return (
    <section
      className={`w-full min-w-0 ${className}`}
      aria-labelledby="landing-features-heading"
    >
      <div className={`mx-auto w-full max-w-6xl ${LANDING_SECTION_STACK}`}>
        <LandingSectionHeading
          id="landing-features-heading"
          eyebrow="Features"
          title="GitHub iterations, surfaced as sprints for your team"
        />

        <ul
          className={`flex list-none flex-wrap items-stretch justify-center p-0 ${LANDING_FEATURE_GRID_GAP}`}
        >
          {LANDING_FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="flex w-full min-w-0 max-w-[21rem] flex-col sm:max-w-[21rem] sm:w-[calc(50%-1.25rem)] md:w-[calc(50%-1.5rem)] lg:w-[calc((100%-6rem)/3)]"
            >
              <LandingFeatureCard
                className="h-full min-h-0 w-full flex-1"
                accentColor={feature.accentColor}
                title={feature.title}
                description={feature.description}
                usesAppHelpTrigger={feature.usesAppHelpTrigger}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
