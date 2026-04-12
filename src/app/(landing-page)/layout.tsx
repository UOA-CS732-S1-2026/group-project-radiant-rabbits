import LandingFooter from "@/components/landing-page/LandingFooter";
import LandingHeader from "@/components/landing-page/LandingHeader";

export default function LandingPageLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-background">
      <LandingHeader />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <LandingFooter />
    </div>
  );
}
