type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <article
      className={`rounded-xl border-l-1 border-brand-accent bg-brand-surface p-lg shadow-md ${className}`}
    >
      {children}
    </article>
  );
}
