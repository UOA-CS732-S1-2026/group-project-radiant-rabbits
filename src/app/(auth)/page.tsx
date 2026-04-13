import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import SignInButton from "@/components/auth/SignInButton";
import { options } from "../api/auth/[...nextauth]/options";

export default async function LoginPage() {
  const session = await getServerSession(options);

  if (session) {
    redirect("/join-create-switch-group");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-primary to-brand-accent px-xl">
      <section className="w-full max-w-form rounded-2xl bg-brand-surface p-xl shadow-lg">
        <header className="text-center">
          <h1 className="text-h1 font-semibold text-brand-dark">SprintHub</h1>
          <p className="mt-sm text-body-sm text-brand-dark/70">
            Automate sprint insights for GitHub student projects.
          </p>
        </header>

        <div className="mt-xl flex justify-center">
          <SignInButton />
        </div>
      </section>
    </main>
  );
}
