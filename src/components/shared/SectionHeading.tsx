type SectionHeadingProps = {
  title: string;
  subtitle?: string;
};

export default function SectionHeading({
  title,
  subtitle,
}: SectionHeadingProps) {
  return (
    <header className="mb-xl border-l-4 border-brand-accent pl-md">
      <h1 className="text-h2 text-brand-dark">{title}</h1>
      {subtitle && (
        <p className="mt-sm text-body-md text-brand-dark/70">{subtitle}</p>
      )}
    </header>
  );
}
