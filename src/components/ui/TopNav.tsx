"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/group", label: "Group" },
  { href: "/repository", label: "Repository" },
  { href: "/sprint", label: "Sprint" },
  { href: "/summary", label: "Summary" },
  { href: "/tasks", label: "Tasks" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="w-full bg-brand-surface/80 shadow-md">
      <div className="mx-auto flex w-full max-w-container items-center justify-between px-xl py-lg">
        <div className="shrink-0">
          <p className="text-h3 font-semibold text-brand-dark">
            Sprint Review Hub
          </p>
          <p className="mt-xs text-body-sm text-brand-dark/60">
            Radiant Rabbits
          </p>
        </div>

        <div className="flex items-center gap-lg">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "border-b-2 border-brand-accent pb-xs text-body-md font-semibold text-brand-accent"
                    : "text-body-md text-brand-dark transition hover:text-brand-accent"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
