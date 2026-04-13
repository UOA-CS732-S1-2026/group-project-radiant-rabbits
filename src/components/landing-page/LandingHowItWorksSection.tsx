import SignInButton from "@/components/auth/SignInButton";
import LandingSectionHeading from "@/components/landing-page/LandingSectionHeading";

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
      <div className="mx-auto w-full max-w-6xl">
        <LandingSectionHeading
          id="landing-how-heading"
          eyebrow="How it works"
          title="From GitHub to sprint review in minutes"
        />

        <ol className="mt-0 grid list-none grid-cols-1 gap-8 p-0 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4 lg:gap-8">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col items-center text-center sm:items-start sm:text-left"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-dark text-body-lg font-bold text-white"
                aria-hidden
              >
                {index + 1}
              </div>
              <h3 className="mt-md text-body-md font-bold text-brand-dark">
                {step.title}
              </h3>
              <p className="mt-sm max-w-xs text-body-sm leading-snug text-brand-dark/70">
                {step.description}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex justify-center sm:mt-16">
          <SignInButton className="rounded-xl bg-brand-primary px-6 py-3 text-body-sm font-semibold text-brand-dark shadow-md transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark">
            Get started with GitHub
          </SignInButton>
        </div>
      </div>
    </section>
  );
}
