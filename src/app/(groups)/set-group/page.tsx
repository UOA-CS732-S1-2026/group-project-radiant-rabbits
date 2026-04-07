import GroupCard from "@/components/ui/GroupCard";
import SprintHubTitle from "@/components/ui/SprintHubTitle";

export default function SetGroupPage() {
  return (
    <div className="min-h-screen bg-brand-background px-6 pb-10 pt-20">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-10 text-center">
          <SprintHubTitle />
        </header>

        <div className="p-lg">
          <div className="grid w-full grid-cols-1 gap-lg">
            <GroupCard>
              <div className="min-h-40" aria-hidden />
            </GroupCard>
          </div>
        </div>
      </div>
    </div>
  );
}
