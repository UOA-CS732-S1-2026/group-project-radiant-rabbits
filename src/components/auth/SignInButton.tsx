"use client";

import { signIn } from "next-auth/react";

type SignInButtonProps = {
  className?: string;
};

export default function SignInButton({ className = "" }: SignInButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        signIn("github", { callbackUrl: "/join-create-switch-group" })
      }
    >
      Sign in with GitHub
    </button>
  );
}
