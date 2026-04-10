import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import PageTopBar from "@/components/ui/PageTopBar";
import SideNav from "@/components/ui/SideNav";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(options);

  return (
    <div className="flex min-h-screen">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <PageTopBar
          repoName="Repo name"
          pageLabel="Current Sprint"
          // Use session-backed avatar
          profileImageUrl={session?.user?.image ?? undefined}
          profileName={session?.user?.name ?? undefined}
        />

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
