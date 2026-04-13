type LandingFeatureCardProps = {
  title: string;
  description: string;
  /** Fill for the top-left swatch (e.g. `#99D1C1`). */
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
      className={`flex min-w-0 flex-col rounded-2xl bg-brand-dark p-5 shadow-md sm:rounded-2xl sm:p-6 ${className}`}
    >
      <div
        className="h-9 w-9 shrink-0 rounded-lg shadow-sm sm:h-10 sm:w-10 sm:rounded-lg"
        style={{ backgroundColor: accentColor }}
        aria-hidden
      />
      <h3 className="mt-4 text-body-lg font-bold leading-snug text-white sm:mt-5 sm:text-h3">
        {title}
      </h3>
      <p className="mt-3 text-body-md leading-relaxed text-white sm:mt-3.5 sm:text-body-lg">
        {description}
      </p>
    </article>
  );
}
