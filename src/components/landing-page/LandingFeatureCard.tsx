type LandingFeatureCardProps = {
  title: string;
  description: string;
  /** Fill for the top accent bar (e.g. `#99D1C1`). */
  accentColor: string;
  className?: string;
};

/** Dark feature tile for marketing / auth — brand navy surface, white type. */
export default function LandingFeatureCard({
  title,
  description,
  accentColor,
  className = "",
}: LandingFeatureCardProps) {
  return (
    <article
      className={`flex min-w-0 flex-col rounded-2xl bg-brand-dark p-4 shadow-md transition duration-300 ease-out hover:-translate-y-1 hover:brightness-110 hover:shadow-xl sm:rounded-2xl sm:p-5 ${className}`}
    >
      <div
        className="h-2.5 w-14 shrink-0 rounded-md shadow-sm sm:h-3 sm:w-16"
        style={{ backgroundColor: accentColor }}
        aria-hidden
      />
      <h3 className="mt-3 text-body-lg font-bold leading-snug text-white sm:mt-3.5 sm:text-h3">
        {title}
      </h3>
      <p className="mt-2 text-body-md leading-snug text-white sm:mt-2.5 sm:text-body-lg sm:leading-snug">
        {description}
      </p>
    </article>
  );
}
