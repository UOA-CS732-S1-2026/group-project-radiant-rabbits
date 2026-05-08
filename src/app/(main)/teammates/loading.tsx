import PageContainer from "@/components/shared/PageContainer";

// A teammates loading component displayed while the team members information is being fetched
export default function TeammatesLoading() {
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <h2 className="text-h3 font-bold text-brand-dark">
          Loading team members...
        </h2>
        <p className="mt-sm text-body-sm text-brand-dark/70">
          Fetching project members and their information.
        </p>
      </PageContainer>
    </div>
  );
}
