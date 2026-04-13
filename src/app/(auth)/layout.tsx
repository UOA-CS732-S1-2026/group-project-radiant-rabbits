import LandingFooter from "@/components/landing-page/LandingFooter";
import LandingHeader from "@/components/landing-page/LandingHeader";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-background">
      <LandingHeader />
      <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col px-6 py-16 sm:px-8 sm:py-20 md:py-24">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
