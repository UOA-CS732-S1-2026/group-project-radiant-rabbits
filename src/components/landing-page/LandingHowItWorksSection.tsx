import LandingSectionHeading from "@/components/landing-page/LandingSectionHeading";
import {
  LANDING_SECTION_STACK,
  LANDING_STEP_GRID_GAP,
  LANDING_STEP_INNER_STACK,
} from "@/components/landing-page/landingStack";

const STEPS = [
  {
    title: "Sign in",
    description: "Authenticate with GitHub. Create or join your project group.",
  },
  {
    title: "Connect repo",
    description: "Link your repository. Commits, PRs, and issues are fetched.",
  },
  {
    title: "Set sprint dates",
    description:
      "Define your sprint window. Activity is filtered to that period.",
  },
  {
    title: "Review & reflect",
    description:
      "Generate your sprint summary and run a meaningful retrospective.",
  },
] as const;

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
          title="From GitHub to sprint review in minutes"
        />

        <ol
          className={`grid list-none grid-cols-1 p-0 sm:grid-cols-2 lg:grid-cols-4 ${LANDING_STEP_GRID_GAP}`}
        >
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className={`group ${LANDING_STEP_INNER_STACK} items-center text-center`}
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-accent text-body-lg font-bold text-brand-dark shadow-sm transition duration-200 ease-out group-hover:scale-110 group-hover:bg-brand-primary group-hover:shadow-md motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                aria-hidden
              >
                {index + 1}
              </div>
              <h3 className="text-body-lg font-extrabold text-brand-dark sm:text-h3 sm:leading-snug">
                {step.title}
              </h3>
              <p className="mx-auto max-w-xs text-body-sm font-semibold leading-relaxed text-brand-dark/85 sm:text-body-md">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
