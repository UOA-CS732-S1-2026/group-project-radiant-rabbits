import PageContainer from "@/components/shared/PageContainer";

// A dashboard loading component displayed while the dashboard information is being fetched
export default function DashboardLoading() {
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <h2 className="text-(length:--text-h3) font-bold text-brand-dark">
          Loading dashboard...
        </h2>
        <p className="mt-sm text-(length:--text-body-sm) text-brand-dark/70">
          Fetching project metrics and timeline data.
        </p>
      </PageContainer>
    </div>
  );
}
