"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SprintHubTitle from "@/components/ui/SprintHubTitle";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/current-sprint", label: "Current Sprint" },
  { href: "/past-sprints", label: "Past Sprints" },
  { href: "/teammates", label: "Teammates" },
];

const bottomItems = [
  {
    href: "/join-create-switch-group",
    label: "Change Group",
    icon: Settings,
  },
  { href: "/sprint-settings", label: "Sprint Settings", icon: Settings },
];

export default function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-56 shrink-0 self-stretch border-r border-brand-dark/10 bg-brand-surface px-md py-xl">
      <div className="flex min-h-screen w-full flex-col">
        {/* Logo */}
        <div className="mb-xl flex w-full flex-col items-center gap-sm px-xs">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-brand-accent/30" />
          <SprintHubTitle
            as="p"
            size="md"
            className="w-full text-center leading-tight"
          />
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
                    ? "rounded-xl bg-brand-accent/10 px-md py-sm text-body-md font-semibold text-brand-accent"
                    : "rounded-xl px-md py-sm text-body-md text-brand-dark transition hover:bg-brand-accent/10 hover:text-brand-accent"
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
                    ? "flex items-center gap-sm rounded-xl bg-brand-accent/10 px-md py-sm text-body-sm font-semibold text-brand-accent"
                    : "flex items-center gap-sm rounded-xl px-md py-sm text-body-sm text-brand-dark transition hover:bg-brand-accent/10 hover:text-brand-accent"
                }
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}

          {/* Logout */}
          <Link
            href="/logout"
            className="flex items-center gap-sm rounded-xl px-md py-sm text-body-sm text-brand-dark transition hover:bg-brand-accent/10 hover:text-brand-accent"
          >
            <LogOut size={16} />
            Log out
          </Link>
        </div>
      </div>
    </nav>
  );
}
