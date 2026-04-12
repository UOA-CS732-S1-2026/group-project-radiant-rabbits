import LandingFeatureCard from "@/components/landing-page/LandingFeatureCard";
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
        <h2
          id="landing-features-heading"
          className="text-center text-h2 font-bold text-brand-dark"
        >
          Features
        </h2>
        <p className="mx-auto mt-sm max-w-2xl text-center text-body-md text-brand-dark/70">
          Everything your team needs to run better sprints
        </p>

        <ul className="mt-xl flex list-none flex-wrap items-stretch justify-center gap-5 p-0 sm:mt-2xl lg:gap-6">
          {LANDING_FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="flex w-full min-w-0 max-w-[19rem] flex-col sm:max-w-[19rem] sm:w-[calc(50%-0.625rem)] lg:w-[calc((100%-3rem)/3)]"
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
