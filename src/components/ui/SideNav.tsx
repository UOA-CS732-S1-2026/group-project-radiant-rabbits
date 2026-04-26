"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
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
    <nav className="flex h-full lg:w-70 w-56 shrink-0 flex-col overflow-hidden border-r border-brand-dark/10 bg-brand-surface px-md py-xl">
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Logo */}
        <div className="mb-xl flex shrink-0 flex-col items-center gap-md px-sm pb-md pt-2">
          <div className="p-3">
            <div className="lg:h-24 lg:w-24 h-16 w-16 shrink-0 rounded-xl bg-brand-accent/30" />
          </div>
          <SprintHubTitle
            as="p"
            size="lg"
            className="lg:text-4xl w-full text-center leading-tight"
          />
        </div>

        {/* Main nav links — scrolls only if space is tight */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-xs pr-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isActive
                      ? "rounded-md border-l-2 border-brand-accent bg-brand-accent/10 py-1.5 pl-2.5 pr-2 text-body-lg font-semibold text-brand-dark"
                      : "rounded-md py-1.5 pl-3 pr-2 text-body-lg text-brand-dark transition hover:bg-brand-accent/10"
                  }
                >
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

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "flex items-center gap-sm rounded-md border-l-2 border-brand-accent bg-brand-accent/10 py-1.5 pl-2.5 pr-2 text-body-md font-semibold text-brand-dark"
                    : "flex items-center gap-sm rounded-md py-1.5 pl-3 pr-2 text-body-md text-brand-dark transition hover:bg-brand-accent/10"
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
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-sm rounded-md py-1.5 pl-3 pr-2 text-body-md text-brand-dark transition hover:bg-brand-accent/10"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
