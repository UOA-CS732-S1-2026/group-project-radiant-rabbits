"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AutoRefresh({ delayMs = 3000 }: { delayMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    // Refresh instead of polling an API endpoint so server components rerun the
    // same group/sync selection logic as a normal navigation.
    const timer = setTimeout(() => router.refresh(), delayMs);
    return () => clearTimeout(timer);
  }, [router, delayMs]);
  return null;
}
