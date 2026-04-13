type StatCardProps = {
  label: string;
  value: string;
};

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="rounded-2xl bg-brand-surface p-lg shadow-md">
      <p className="text-body-sm text-brand-dark/70">{label}</p>
      <p className="mt-sm text-h2 text-brand-dark">{value}</p>
    </article>
  );
}
