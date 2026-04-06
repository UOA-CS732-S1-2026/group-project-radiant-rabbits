import BorderedPanel from "@/components/ui/BorderedPanel";
import GroupCard from "@/components/ui/GroupCard";

const DUMMY_REPO_NAMES = [
  "group-project-radiant-rabbits",
  "sprint-hub",
  "team-alpha",
  "team-beta",
  "team-gamma",
  "team-delta",
] as const;

export default function JoinCreateSwitchGroupPage() {
  return (
    <div className="min-h-screen bg-brand-background px-6 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-brand-dark/10 bg-white/90 p-10 shadow-lg">
        <header className="mb-8 text-center">
          <h1 className="mb-4 text-h2 font-semibold text-brand-dark">
            Join / Create / Switch Group
          </h1>
          <p className="text-body-md text-brand-dark/60">SOFTENG</p>
        </header>

        <BorderedPanel className="p-lg">
          <div className="max-h-[min(70vh,40rem)] overflow-y-auto pr-sm">
            <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
              {DUMMY_REPO_NAMES.map((repoName) => (
                <GroupCard key={repoName}>
                  <p className="text-center text-body-md font-medium text-brand-dark">
                    {repoName}
                  </p>
                </GroupCard>
              ))}
            </div>
          </div>
        </BorderedPanel>
      </div>
    </div>
  );
}
