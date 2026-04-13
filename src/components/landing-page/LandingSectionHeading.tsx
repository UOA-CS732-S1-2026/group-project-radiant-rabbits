import { LANDING_HEADING_INNER_STACK } from "@/components/landing-page/landingStack";

type LandingSectionHeadingProps = {
  /** For `aria-labelledby` on the parent section. */
  id: string;
  eyebrow: string;
  title: string;
  as?: "h1" | "h2";
  className?: string;
};

/** Shared stack: small uppercase label + bold section title. */
export default function LandingSectionHeading({
  id,
  eyebrow,
  title,
  as: Heading = "h2",
  className = "",
}: LandingSectionHeadingProps) {
  return (
    <header
      className={`text-center ${LANDING_HEADING_INNER_STACK} ${className}`}
    >
      <p className="text-body-sm font-bold uppercase tracking-[0.14em] text-brand-dark sm:text-body-md">
        {eyebrow}
      </p>
      <Heading
        id={id}
        className="text-balance text-[1.875rem] font-extrabold leading-[1.15] tracking-tight text-brand-dark sm:text-[2rem] md:text-[2.125rem]"
      >
        {title}
      </Heading>
    </header>
  );
}
