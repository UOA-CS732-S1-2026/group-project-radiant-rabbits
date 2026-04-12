import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

export default async function LoginPage() {
  const session = await getServerSession(options);

  if (session) {
    redirect("/join-create-switch-group");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-xl py-2xl">
      <section className="w-full max-w-form rounded-2xl bg-brand-surface p-xl shadow-lg">
        <header className="text-center">
          <h1 className="text-h1 font-semibold text-brand-dark">SprintHub</h1>
          <p className="mt-sm text-body-sm text-brand-dark/70">
            Automate sprint insights for GitHub student projects.
          </p>
        </header>
      </section>
    </div>
  );
}
