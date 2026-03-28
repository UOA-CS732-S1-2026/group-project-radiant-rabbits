"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopNav() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  const linkBase =
    "text-body-md text-brand-dark transition hover:text-brand-accent";
  const activeLink =
    "border-b-2 border-brand-accent pb-xs font-semibold text-brand-accent";

  return (
    <nav className="w-full bg-brand-surface/80 shadow-md">
      <div className="mx-auto flex w-full max-w-container items-center justify-between px-xl py-lg">
        <div className="shrink-0">
          <p className="text-h3 text-brand-dark">Sprint Review Hub</p>
          <p className="mt-xs text-body-sm text-brand-dark/60">
            Radiant Rabbits
          </p>
        </div>

        <div className="flex items-center gap-lg">
          <Link
            href="/dashboard"
            className={isActive("/dashboard") ? activeLink : linkBase}
          >
            Dashboard
          </Link>
          <Link
            href="/repository"
            className={isActive("/repository") ? activeLink : linkBase}
          >
            Repository
          </Link>
          <Link
            href="/sprint"
            className={isActive("/sprint") ? activeLink : linkBase}
          >
            Sprint
          </Link>
          <Link
            href="/summary"
            className={isActive("/summary") ? activeLink : linkBase}
          >
            Summary
          </Link>
          <Link
            href="/tasks"
            className={isActive("/tasks") ? activeLink : linkBase}
          >
            Tasks
          </Link>
        </div>
      </div>
    </nav>
  );
}
