import Card from "@/components/ui/Card";
import PageContainer from "@/components/ui/PageContainer";
import SectionHeading from "@/components/ui/SectionHeading";

export default function TasksPage() {
  return (
    <PageContainer>
      <SectionHeading
        title="Issues as Tasks"
        subtitle="Track repository issues opened and closed during the sprint."
      />

      <section className="grid gap-lg lg:grid-cols-2">
        <Card>
          <h2 className="text-h3 text-brand-dark">Open Issues</h2>
          <ul className="mt-md space-y-sm text-body-sm text-brand-dark/70">
            <li>#21 Set up GitHub OAuth flow</li>
            <li>#24 Build contributor chart component</li>
            <li>#28 Add sprint history filtering</li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-h3 text-brand-dark">Closed This Sprint</h2>
          <ul className="mt-md space-y-sm text-body-sm text-brand-dark/70">
            <li>#12 Create login wireframe</li>
            <li>#15 Implement dashboard layout</li>
            <li>#18 Connect repository form UI</li>
          </ul>
        </Card>
      </section>
    </PageContainer>
  );
}
