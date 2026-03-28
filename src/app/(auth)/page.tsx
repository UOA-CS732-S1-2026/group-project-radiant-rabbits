import Button from "@/components/ui/Button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-primary to-brand-accent px-xl">
      <section className="w-full max-w-form rounded-2xl bg-brand-surface p-xl shadow-lg">
        <header className="text-center">
          <h1 className="text-h1 font-semibold text-brand-dark">
            Sprint Review Hub
          </h1>
          <p className="mt-sm text-body-sm text-brand-dark/70">
            Automate sprint insights for GitHub student projects.
          </p>
        </header>

        <div className="mt-xl flex justify-center">
          <Button>Sign in with GitHub</Button>
        </div>
      </section>
    </main>
  );
}
