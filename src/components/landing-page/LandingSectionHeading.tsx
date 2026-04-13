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
    <header className={`text-center ${className}`}>
      <p className="text-body-xs font-semibold uppercase tracking-widest text-brand-dark/55">
        {eyebrow}
      </p>
      <Heading
        id={id}
        className="mt-5 mb-8 text-balance text-h2 font-bold leading-tight text-brand-dark sm:mt-6 sm:mb-10"
      >
        {title}
      </Heading>
    </header>
  );
}
