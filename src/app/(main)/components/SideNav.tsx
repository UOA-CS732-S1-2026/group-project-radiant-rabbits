"use client";

import {
  Clock,
  History,
  Home,
  Loader2,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import AppLogoMark from "@/components/landing-page/AppLogoMark";
import SprintHubTitle from "@/components/shared/SprintHubTitle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/current-sprint", label: "Current Sprint", icon: Clock },
  { href: "/past-sprints", label: "Past Sprints", icon: History },
  { href: "/teammates", label: "Teammates", icon: Users },
];

const bottomItems = [
  {
    href: "/join-create-switch-group",
    label: "Change Group",
    icon: Settings,
  },
];

export default function SideNav() {
  const pathname = usePathname();

  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/" });
  };

  const dashboardReturnTarget =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/")
      ? pathname
      : "/dashboard";
  const changeGroupHref = `/join-create-switch-group?returnTo=${encodeURIComponent(dashboardReturnTarget)}`;

  return (
    <nav className="flex h-full w-56 shrink-0 flex-col overflow-hidden border-r border-brand-dark/10 bg-brand-surface px-md py-xl md:w-60 lg:w-64 xl:w-72">
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Logo */}
        <div className="mb-xl flex shrink-0 flex-col items-center px-sm pb-md pt-2">
          <div className="p-3">
            <AppLogoMark className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24" />
          </div>
          <SprintHubTitle
            as="p"
            size="lg"
            className="text-(length:--text-h1) w-full text-center leading-tight"
          />
        </div>

        {/* Main nav links — scrolls only if space is tight */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-xs pr-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isActive
                      ? "flex items-center gap-sm rounded-md border-1-2 border-brand-accent bg-brand-accent/10 py-1.5 pl-2.5 pr-2 text-(length:--text-body-lg) font-semibold text-brand-dark"
                      : "flex items-center gap-sm rounded-md py-1.5 pl-3 pr-2 text-(length:--text-body-lg) text-brand-dark transition hover:bg-brand-accent/10"
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom links — pinned to viewport bottom */}
        <div className="mt-md flex shrink-0 flex-col gap-xs border-t border-brand-dark/10 pt-md">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const href =
              item.href === "/join-create-switch-group"
                ? changeGroupHref
                : item.href;

            return (
              <Link
                key={item.href}
                href={href}
                className={
                  isActive
                    ? "flex items-center gap-sm rounded-md border-l-2 border-brand-accent bg-brand-accent/10 py-1.5 pl-2.5 pr-2 text-(length:--text-body-md) font-semibold text-brand-dark"
                    : "flex items-center gap-sm rounded-md py-1.5 pl-3 pr-2 text-(length:--text-body-md) text-brand-dark transition hover:bg-brand-accent/10"
                }
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}

          {/* Logout */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            aria-disabled={isSigningOut}
            className="flex items-center gap-sm rounded-md py-1.5 pl-3 pr-2 text-body-md text-brand-dark transition hover:bg-brand-accent/10 disabled:opacity-60"
          >
            {isSigningOut ? (
              <Loader2 size={18} className="animate-spin" aria-hidden />
            ) : (
              <LogOut size={18} aria-hidden />
            )}
            {isSigningOut ? "Signing out…" : "Log out"}
          </button>
        </div>
      </div>
    </nav>
  );
}
