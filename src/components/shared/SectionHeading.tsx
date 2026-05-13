type SectionHeadingProps = {
  title: string;
  subtitle?: string;
};

export default function SectionHeading({
  title,
  subtitle,
}: SectionHeadingProps) {
  return (
    <div className="mb-xl border-l-4 border-brand-accent pl-md">
      <h2 className="text-(length:--text-h2) text-brand-dark">{title}</h2>
      {subtitle && (
        <p className="mt-sm text-(length:--text-body-md) text-brand-dark/70">
          {subtitle}
        </p>
      )}
    </div>
  );
}
