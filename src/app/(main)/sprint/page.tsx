import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import PageContainer from "@/components/ui/PageContainer";
import SectionHeading from "@/components/ui/SectionHeading";

export default function SprintPage() {
  return (
    <PageContainer>
      <SectionHeading
        title="Sprint Configuration"
        subtitle="Create sprint periods and filter repository activity by date."
      />

      <section className="max-w-form">
        <Card>
          <form className="space-y-md">
            <Input
              id="sprint-name"
              label="Sprint name"
              placeholder="Sprint 3"
            />
            <Input id="start-date" label="Start date" type="date" />
            <Input id="end-date" label="End date" type="date" />
            <Button type="submit">Save Sprint</Button>
          </form>
        </Card>
      </section>
    </PageContainer>
  );
}
