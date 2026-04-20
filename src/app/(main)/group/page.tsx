import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import PageContainer from "@/components/shared/PageContainer";
import SectionHeading from "@/components/shared/SectionHeading";

export default function GroupPage() {
  return (
    <PageContainer>
      <SectionHeading
        title="Create or Join a Project Group"
        subtitle="Set up your project space or join an existing team."
      />

      <section className="grid gap-lg md:grid-cols-2">
        <Card>
          <h2 className="mb-md text-h3 text-brand-dark">Create Group</h2>
          <form className="space-y-md">
            <Input
              id="group-name"
              label="Group name"
              placeholder="Radiant Rabbits"
            />
            <Input
              id="course-name"
              label="Course / project"
              placeholder="SOFTENG 310"
            />
            <Button type="submit">Create Group</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-md text-h3 text-brand-dark">Join Group</h2>
          <form className="space-y-md">
            <Input
              id="invite-code"
              label="Invite code"
              placeholder="Enter team code"
            />
            <Button type="submit" variant="white">
              Join Group
            </Button>
          </form>
        </Card>
      </section>
    </PageContainer>
  );
}
