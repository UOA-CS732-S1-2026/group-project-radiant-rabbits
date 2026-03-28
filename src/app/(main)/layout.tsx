import Footer from "@/components/ui/Footer";
import TopNav from "@/components/ui/TopNav";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <TopNav />
      {children}
      <Footer />
    </>
  );
}
