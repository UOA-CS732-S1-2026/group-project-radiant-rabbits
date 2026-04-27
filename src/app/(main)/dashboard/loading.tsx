// A dashboard loading component displayed while the dashboard information is being fetched
export default function DashboardLoading() {
  return (
    <div className="mt-6 mx-5 mb-6 border-2 border-brand-border rounded-lg shadow-lg">
      <div className="rounded-lg bg-brand-surface p-lg shadow-md">
        <h2 className="text-h3 font-bold text-brand-dark">
          Loading dashboard...
        </h2>
        <p className="mt-sm text-body-sm text-brand-dark/70">
          Fetching project metrics and timeline data.
        </p>
      </div>
    </div>
  );
}
