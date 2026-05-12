import {
  LANDING_HEADING_INNER_STACK,
  LANDING_SECTION_EYEBROW_TEXT_CLASS,
} from "@/components/landing-page/landingStack";

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
      <p className={LANDING_SECTION_EYEBROW_TEXT_CLASS}>{eyebrow}</p>
      <Heading
        id={id}
        className="text-balance text-(length:--text-h1) font-extrabold leading-[var(--text-h1--line-height)] tracking-tight text-brand-dark"
      >
        {title}
      </Heading>
    </header>
  );
}
