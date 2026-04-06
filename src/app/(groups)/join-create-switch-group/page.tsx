import GroupCard from "@/components/ui/GroupCard";

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

        <div className="w-full min-w-0 text-left">
          <GroupCard>
            <h2 className="text-h3 font-semibold text-brand-dark">
              Radiant Rabbits
            </h2>
            <p className="mt-1 text-body-sm text-brand-dark/60">
              SOFTENG 310 · 5 members
            </p>
            <p className="mt-4 text-body-md text-brand-dark/80">
              Preview: this is how a group card looks in context.
            </p>
          </GroupCard>
        </div>
      </div>
    </div>
  );
}
