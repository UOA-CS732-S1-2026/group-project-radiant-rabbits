import Card from "@/components/ui/Card";
import PageContainer from "@/components/ui/PageContainer";
import SectionHeading from "@/components/ui/SectionHeading";

const teammates = [
  { name: "Anna James", avatarClass: "bg-brand-accent/60" },
  { name: "Tom Jones", avatarClass: "bg-brand-primary" },
  { name: "Ella Green", avatarClass: "bg-red-400" },
  { name: "Jane Smith", avatarClass: "bg-orange-300" },
  { name: "John Blue", avatarClass: "bg-green-300" },
  { name: "Emma Green", avatarClass: "bg-yellow-300" },
  { name: "Sam Smith", avatarClass: "bg-pink-300" },
];

function AvatarPlaceholder({ avatarClass }: { avatarClass: string }) {
  return (
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-full ${avatarClass} text-body-md font-medium text-brand-dark`}
    >
      ○
    </div>
  );
}

export default function TeammatesPage() {
  return (
    <PageContainer>
      <SectionHeading
        title="Teammates"
        subtitle="View your current project team and invite links."
      />

      <Card className="border border-brand-dark/10 border-l-0 shadow-none">
        <div className="rounded-xl border border-brand-dark/10 bg-brand-surface">
          {/* Header */}
          <div className="border-b border-brand-dark/10 px-lg py-lg">
            <h2 className="text-h3 font-semibold text-brand-dark">
              Team Members
            </h2>
          </div>

          {/* List */}
          <div className="px-lg py-md">
            <div className="space-y-md">
              {teammates.map((person) => (
                <div
                  key={person.name}
                  className="flex items-center gap-md border-b border-brand-dark/10 pb-md"
                >
                  <AvatarPlaceholder avatarClass={person.avatarClass} />

                  <p className="text-body-lg font-semibold text-brand-dark">
                    {person.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
