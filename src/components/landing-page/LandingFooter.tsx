export default function LandingFooter() {
  return (
    <footer
      className="mt-auto w-full px-4 py-5 sm:px-6 sm:py-6"
      style={{
        background: "linear-gradient(to right, #7BB8FF, #B8A9FE)",
      }}
    >
      <div className="flex w-full min-w-0 flex-row items-center justify-between gap-3 text-xs text-white sm:gap-4 sm:text-body-sm">
        <p className="min-w-0 flex-1 text-left font-semibold drop-shadow-sm">
          SprintHub — Radiant Rabbits
        </p>
        <p className="min-w-0 flex-1 text-right text-white/90">
          Built for teams learning agile
        </p>
      </div>
    </footer>
  );
}
