export default function LandingFooter() {
  return (
    <footer className="mt-auto w-full bg-brand-accent-dark px-4 py-2.5 sm:px-6 sm:py-2.5">
      <div className="flex w-full min-w-0 flex-row items-center justify-between gap-3 text-(length:--text-body-sm) text-white sm:gap-4">
        <p className="min-w-0 flex-1 text-left font-semibold drop-shadow-sm">
          SprintHub · Radiant Rabbits
        </p>
        <p className="min-w-0 flex-1 text-right font-semibold text-white/90">
          Sprint views from your GitHub iteration field
        </p>
      </div>
    </footer>
  );
}
