"use client";

import { signIn } from "next-auth/react";

type TestSignInButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

export default function TestSignInButton({
  className = "",
  children = "Test Sign In",
}: TestSignInButtonProps) {
  return (
    <button
      type="button"
      className={className}
      data-testid="test-sign-in"
      onClick={() =>
        signIn("credentials", { callbackUrl: "/join-create-switch-group" })
      }
    >
      {children}
    </button>
  );
}
