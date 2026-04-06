"use client";

import { LogOut, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/current-sprint", label: "Current Sprint" },
  { href: "/past-sprints", label: "Past Sprints" },
  { href: "/teammates", label: "Teammates" },
];

const bottomItems = [
  { href: "/change-group", label: "Change Group", icon: Settings },
  { href: "/sprint-settings", label: "Sprint Settings", icon: Settings },
];

export default function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-56 shrink-0 self-stretch border-r border-brand-border bg-brand-surface px-md py-xl">
      <div className="flex min-h-screen w-full flex-col">
        {/* Logo */}
        <div className="mb-xl flex flex-col items-center gap-sm">
          <div className="h-14 w-14 rounded-xl bg-brand-accent/30" />
          <p className="text-h3 font-semibold text-brand-accent">SprintHub</p>
        </div>

        {/* Main nav links */}
        <div className="flex flex-col gap-xs">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "rounded-lg bg-brand-accent/10 px-sm py-xs text-body-md font-semibold text-brand-accent"
                    : "rounded-lg px-sm py-xs text-body-md text-brand-dark transition hover:bg-brand-accent/10 hover:text-brand-accent"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Bottom links */}
        <div className="mt-auto flex flex-col gap-xs">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "flex items-center gap-sm rounded-lg bg-brand-accent/10 px-sm py-xs text-body-sm font-semibold text-brand-accent"
                    : "flex items-center gap-sm rounded-lg px-sm py-xs text-body-sm text-brand-dark transition hover:bg-brand-accent/10 hover:text-brand-accent"
                }
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}

          <Link
            href="/logout"
            className="flex items-center gap-sm rounded-lg px-sm py-xs text-body-sm text-brand-dark transition hover:bg-brand-accent/10 hover:text-brand-accent"
          >
            <LogOut size={15} />
            Log out
          </Link>
        </div>
      </div>
    </nav>
  );
}
