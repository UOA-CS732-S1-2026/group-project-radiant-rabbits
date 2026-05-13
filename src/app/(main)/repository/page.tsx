import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import PageContainer from "@/components/shared/PageContainer";
import SectionHeading from "@/components/shared/SectionHeading";

export default function RepositoryPage() {
  // Legacy static mock retained while repository selection is handled by the
  // group creation flow backed by GitHub repo access.
  return (
    <PageContainer>
      <SectionHeading
        title="Connect GitHub Repository"
        subtitle="Link your repository to fetch commits, contributors, pull requests, and issues."
      />

      <section className="max-w-form">
        <Card>
          <form className="space-y-md">
            <Input
              id="repo-url"
              label="Repository URL"
              placeholder="https://github.com/org/repo"
            />
            <div className="flex gap-sm">
              <Button type="submit">Connect Repository</Button>
              <Button type="button" variant="white">
                Test Connection
              </Button>
            </div>
            <p className="text-(length:--text-body-sm) text-brand-dark/70">
              Show validation or inaccessible repository errors here.
            </p>
          </form>
        </Card>
      </section>
    </PageContainer>
  );
}
