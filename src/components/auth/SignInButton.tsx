"use client";

import { signIn } from "next-auth/react";

type SignInButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

export default function SignInButton({
  className = "",
  children = "Sign in with GitHub",
}: SignInButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        signIn("github", { callbackUrl: "/join-create-switch-group" })
      }
    >
      {children}
    </button>
  );
}
