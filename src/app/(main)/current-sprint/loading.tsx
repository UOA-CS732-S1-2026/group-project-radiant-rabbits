import PageContainer from "@/components/shared/PageContainer";

// A current sprint loading component displayed while the current sprint information is being fetched
export default function CurrentSprintLoading() {
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <h2 className="text-h3 font-bold text-brand-dark">
          Loading current sprint...
        </h2>
        <p className="mt-sm text-body-sm text-brand-dark/70">
          Fetching project metrics and sprint information.
        </p>
      </PageContainer>
    </div>
  );
}
