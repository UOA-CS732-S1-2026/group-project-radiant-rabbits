import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SprintHub",
  description: "Sprint Review Hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Font variables live at the root so route groups and portal-based
          overlays inherit the same typography without wrapping providers. */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-brand-background font-sans text-brand-dark`}
      >
        {children}
      </body>
    </html>
  );
}
