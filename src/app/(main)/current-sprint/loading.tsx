import PageContainer from "@/components/shared/PageContainer";

// Current sprint resolution can wait on group/session data, so the fallback
// names the domain work instead of showing a blank app shell.
export default function CurrentSprintLoading() {
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <h2 className="text-(length:--text-h3) font-bold text-brand-dark">
          Loading current sprint...
        </h2>
        <p className="mt-sm text-(length:--text-body-sm) text-brand-dark/70">
          Fetching project metrics and sprint information.
        </p>
      </PageContainer>
    </div>
  );
}
