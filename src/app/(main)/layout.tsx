import PageTopBar from "@/components/ui/PageTopBar";
import SideNav from "@/components/ui/SideNav";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <PageTopBar
          repoName="Repo name"
          pageLabel="Current Sprint"
          profileImageUrl=""
        />

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
