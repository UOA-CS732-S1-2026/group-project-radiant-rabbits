import LandingFeatureCard from "@/components/landing-page/LandingFeatureCard";
import LandingSectionHeading from "@/components/landing-page/LandingSectionHeading";
import { LANDING_FEATURES } from "@/components/landing-page/landingFeatures";

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
      <div className="mx-auto w-full max-w-6xl">
        <LandingSectionHeading
          id="landing-features-heading"
          eyebrow="Features"
          title="Everything your team needs to run better sprints"
        />

        <ul className="mt-0 flex list-none flex-wrap items-stretch justify-center gap-6 p-0 sm:gap-7 lg:gap-8">
          {LANDING_FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="flex w-full min-w-0 max-w-[19rem] flex-col sm:max-w-[19rem] sm:w-[calc(50%-0.875rem)] lg:w-[calc((100%-4rem)/3)]"
            >
              <LandingFeatureCard
                className="h-full min-h-0 w-full flex-1"
                accentColor={feature.accentColor}
                title={feature.title}
                description={feature.description}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
