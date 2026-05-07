type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <article
      className={`rounded-xl border border-brand-dark/10 bg-brand-surface p-lg ${className}`}
    >
      {children}
    </article>
  );
}
