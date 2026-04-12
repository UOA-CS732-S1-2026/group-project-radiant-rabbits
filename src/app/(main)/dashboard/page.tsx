import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import SignOutButton from "@/components/auth/SignOutButton";
import StatCard from "@/components/main/StatCard";
import Card from "@/components/shared/Card";
import PageContainer from "@/components/shared/PageContainer";
import SectionHeading from "@/components/shared/SectionHeading";

export default async function DashboardPage() {
  const session = await getServerSession(options);

  if (!session?.user) {
    redirect("/");
  }

  return (
    <PageContainer>
      <SectionHeading
        title="Dashboard"
        subtitle="A central overview of contributors, commits, and sprint activity."
      />

      {/* PLACEHOLDER FOR NOW: Show GitHub profile image and name*/}
      <div className="mt-md flex items-center gap-md">
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt="GitHub profile"
            width={48}
            height={48}
            className="rounded-full"
          />
        ) : null}
        <p className="text-body-md text-brand-dark">
          {" "}
          Welcome {session.user.name ?? "GitHub user"}{" "}
        </p>
      </div>

      <div className="mt-md">
        <SignOutButton />
      </div>

      <section className="grid gap-lg md:grid-cols-3">
        <StatCard label="Contributors" value="5" />
        <StatCard label="Commits" value="42" />
        <StatCard label="Issues Closed" value="18" />
      </section>

      <section className="mt-xl grid gap-xl lg:grid-cols-2">
        <Card>
          <h2 className="text-h3 text-brand-dark">Sprint Activity Summary</h2>
          <p className="mt-md text-body-sm text-brand-dark/70">
            Placeholder for a short summary of major changes, team progress, and
            key wins.
          </p>
        </Card>

        <Card>
          <h2 className="text-h3 text-brand-dark">Contributor Activity</h2>
          <ul className="mt-md space-y-sm text-body-sm text-brand-dark/70">
            <li>Nancy — 14 commits</li>
            <li>Nadia — 11 commits</li>
            <li>Selin — 8 commits</li>
            <li>Emily — 5 commits</li>
          </ul>
        </Card>
      </section>

      <section className="mt-xl">
        <Card>
          <h2 className="text-h3 text-brand-dark">Sprint History</h2>
          <p className="mt-md text-body-sm text-brand-dark/70">
            Placeholder for sprint filtering and historical summaries.
          </p>
        </Card>
      </section>
    </PageContainer>
  );
}
