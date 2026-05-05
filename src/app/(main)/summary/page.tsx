import Card from "@/components/shared/Card";
import PageContainer from "@/components/shared/PageContainer";
import SectionHeading from "@/components/shared/SectionHeading";

export default function SummaryPage() {
  return (
    <PageContainer>
      <SectionHeading
        title="Sprint Review Summary"
        subtitle="Review sprint highlights for the selected sprint. Generate a review from the Current Sprint page."
      />

      <section className="grid gap-lg lg:grid-cols-2">
        <Card>
          <h2 className="text-h3 text-brand-dark">Major Code Changes</h2>
          <ul className="mt-md list-disc space-y-sm pl-md text-body-sm text-brand-dark/70">
            <li>Implemented project group authentication flow</li>
            <li>Connected GitHub repository data source</li>
            <li>Added sprint setup page and filters</li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-h3 text-brand-dark">Active Contributors</h2>
          <p className="mt-md text-body-sm text-brand-dark/70">
            Nancy and Nadia contributed most heavily this sprint, mainly across
            dashboard and repository integration work.
          </p>
        </Card>
      </section>

      <section className="mt-lg">
        <Card>
          <h2 className="text-h3 text-brand-dark">Overall Sprint Progress</h2>
          <p className="mt-md text-body-sm text-brand-dark/70">
            The team completed the core wireframes and laid the groundwork for
            sprint-based GitHub activity analysis.
          </p>
        </Card>
      </section>
    </PageContainer>
  );
}
