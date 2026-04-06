import SprintHubTitle from "@/components/ui/SprintHubTitle";

export default function SetGroupPage() {
  return (
    <div className="min-h-screen bg-brand-background px-6 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-brand-dark/10 bg-white/90 p-10 shadow-lg">
        <header className="mb-10 text-center">
          <SprintHubTitle />
        </header>
        <p className="text-center text-body-md text-brand-dark/60">
          Group settings (content to follow).
        </p>
      </div>
    </div>
  );
}
