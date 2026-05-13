import PageContainer from "@/components/shared/PageContainer";

// Teammate profiles are joined from group membership refs, so make the loading
// state clear that profile data is being resolved.
export default function TeammatesLoading() {
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <h2 className="text-(length:--text-h3) font-bold text-brand-dark">
          Loading team members...
        </h2>
        <p className="mt-sm text-(length:--text-body-sm) text-brand-dark/70">
          Fetching project members and their information.
        </p>
      </PageContainer>
    </div>
  );
}
