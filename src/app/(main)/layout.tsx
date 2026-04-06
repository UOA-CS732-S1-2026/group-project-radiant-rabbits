import SideNav from "@/components/ui/SideNav";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen items-stretch">
      <SideNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
