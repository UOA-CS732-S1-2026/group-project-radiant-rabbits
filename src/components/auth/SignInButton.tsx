"use client";

import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

type SignInButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

export default function SignInButton({
  className = "",
  children = "Sign in with GitHub",
}: SignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";

  const handleClick = async () => {
    setIsLoading(true);
    await signIn(isTestMode ? "test-login" : "github", {
      callbackUrl: isTestMode ? "/dashboard" : "/join-create-switch-group",
    });
  };

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent-dark ${className}`}
      onClick={handleClick}
      disabled={isLoading}
      aria-disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden />
          Signing in…
        </>
      ) : (
        children
      )}
    </button>
  );
}
