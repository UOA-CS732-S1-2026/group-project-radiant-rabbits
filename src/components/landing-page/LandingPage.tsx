import SignInButton from "@/components/auth/SignInButton";

/** UI for the `/landing-page` route — add sections as you build out the marketing page. */
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-background">
      <header className="border-b border-brand-dark/10 bg-brand-surface px-lg py-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-body-lg font-semibold text-brand-dark">
            SprintHub
          </span>
          <SignInButton />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-xl py-2xl">
        <section className="w-full max-w-2xl text-center">
          <h1 className="text-h1 font-semibold text-brand-dark">
            Landing page
          </h1>
          <p className="mt-md text-body-md text-brand-dark/70">
            Build out hero, features, and footer here in{" "}
            <code className="rounded bg-brand-dark/5 px-1 py-0.5 text-body-sm">
              src/components/landing-page/
            </code>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
