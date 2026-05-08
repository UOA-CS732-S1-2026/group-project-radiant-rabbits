import PageContainer from "@/components/shared/PageContainer";

// A past sprints loading component displayed while the past sprint information is being fetched
export default function PastSprintLoading() {
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <h2 className="text-h3 font-bold text-brand-dark">
          Loading past sprints...
        </h2>
        <p className="mt-sm text-body-sm text-brand-dark/70">
          Fetching project metrics and past sprint information.
        </p>
      </PageContainer>
    </div>
  );
}
