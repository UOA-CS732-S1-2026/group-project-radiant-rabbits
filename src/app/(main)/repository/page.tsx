import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import PageContainer from "@/components/ui/PageContainer";
import SectionHeading from "@/components/ui/SectionHeading";

export default function RepositoryPage() {
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
              <Button type="button" variant="secondary">
                Test Connection
              </Button>
            </div>
            <p className="text-body-sm text-brand-dark/60">
              Show validation or inaccessible repository errors here.
            </p>
          </form>
        </Card>
      </section>
    </PageContainer>
  );
}
