import LandingSectionHeading from "@/components/landing-page/LandingSectionHeading";
import { LANDING_HOW_IT_WORKS_STEPS } from "@/components/landing-page/landingHowItWorks";
import {
  LANDING_SECTION_STACK,
  LANDING_STEP_GRID_GAP,
  LANDING_STEP_INNER_STACK,
} from "@/components/landing-page/landingStack";

type LandingHowItWorksSectionProps = {
  className?: string;
};

export default function LandingHowItWorksSection({
  className = "",
}: LandingHowItWorksSectionProps) {
  return (
    <section
      className={`w-full min-w-0 ${className}`}
      aria-labelledby="landing-how-heading"
    >
      <div className={`mx-auto w-full max-w-6xl ${LANDING_SECTION_STACK}`}>
        <LandingSectionHeading
          id="landing-how-heading"
          eyebrow="How it works"
          title="From GitHub iterations to sprint review"
        />

        <ol
          className={`grid list-none grid-cols-1 p-0 sm:[grid-template-columns:repeat(2,minmax(0,1fr))] lg:[grid-template-columns:repeat(4,minmax(0,1fr))] ${LANDING_STEP_GRID_GAP}`}
        >
          {LANDING_HOW_IT_WORKS_STEPS.map((step, index) => (
            <li
              key={step.title}
              className={`group min-w-0 w-full ${LANDING_STEP_INNER_STACK} items-center text-center`}
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-accent text-(length:--text-body-lg) font-bold text-brand-dark shadow-sm transition duration-200 ease-out group-hover:scale-110 group-hover:bg-brand-primary group-hover:shadow-md motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                aria-hidden
              >
                {index + 1}
              </div>
              <h3 className="text-body-lg font-extrabold text-brand-dark sm:text-h3 sm:leading-snug">
                {step.title}
              </h3>
              <p className="w-full min-w-0 text-pretty text-(length:--text-body-sm) font-semibold leading-relaxed text-brand-dark/85">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
