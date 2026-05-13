"use client";

import { Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

export default function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    await signOut({ callbackUrl: "/" });
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-disabled={isLoading}
      className="inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent-dark"
    >
      {isLoading ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden />
          Signing out…
        </>
      ) : (
        "Sign Out of GitHub"
      )}
    </button>
  );
}
