import PageContainer from "@/components/shared/PageContainer";

// Past sprint rows aggregate several GitHub-derived event counts, so this route
// benefits from a domain-specific loading state.
export default function PastSprintLoading() {
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <h2 className="text-(length:--text-h3) font-bold text-brand-dark">
          Loading past sprints...
        </h2>
        <p className="mt-sm text-(length:--text-body-sm) text-brand-dark/70">
          Fetching project metrics and past sprint information.
        </p>
      </PageContainer>
    </div>
  );
}
