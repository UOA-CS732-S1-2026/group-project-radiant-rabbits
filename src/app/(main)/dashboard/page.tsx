import Card from "@/components/ui/Card";
import PageContainer from "@/components/ui/PageContainer";
import SectionHeading from "@/components/ui/SectionHeading";
import StatCard from "@/components/ui/StatCard";

export default function DashboardPage() {
  return (
    <PageContainer>
      <SectionHeading
        title="Dashboard"
        subtitle="A central overview of contributors, commits, and sprint activity."
      />

      <section className="grid gap-lg md:grid-cols-3">
        <StatCard label="Contributors" value="5" />
        <StatCard label="Commits" value="42" />
        <StatCard label="Issues Closed" value="18" />
      </section>

      <section className="mt-xl grid gap-xl lg:grid-cols-2">
        <Card>
          <h2 className="text-h3 text-brand-dark">Sprint Activity Summary</h2>
          <p className="mt-md text-body-sm text-brand-dark/70">
            Placeholder for a short summary of major changes, team progress, and
            key wins.
          </p>
        </Card>

        <Card>
          <h2 className="text-h3 text-brand-dark">Contributor Activity</h2>
          <ul className="mt-md space-y-sm text-body-sm text-brand-dark/70">
            <li>Nancy — 14 commits</li>
            <li>Nadia — 11 commits</li>
            <li>Selin — 8 commits</li>
            <li>Emily — 5 commits</li>
          </ul>
        </Card>
      </section>

      <section className="mt-xl">
        <Card>
          <h2 className="text-h3 text-brand-dark">Sprint History</h2>
          <p className="mt-md text-body-sm text-brand-dark/70">
            Placeholder for sprint filtering and historical summaries.
          </p>
        </Card>
      </section>
    </PageContainer>
  );
}
