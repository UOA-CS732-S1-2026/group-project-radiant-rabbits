import PageTopBar from "@/components/ui/PageTopBar";
import SideNav from "@/components/ui/SideNav";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen min-h-0 overflow-hidden">
      <SideNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          repoName="Repo name"
          pageLabel="Current Sprint"
          profileImageUrl=""
        />

        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
