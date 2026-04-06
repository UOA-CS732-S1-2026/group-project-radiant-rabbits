"use client";

import { signIn } from "next-auth/react";

export default function SignInButton() {
  return (
    <button
      type="button"
      onClick={() =>
        signIn("github", { callbackUrl: "/join-create-switch-group" })
      }
    >
      Sign In With GitHub
    </button>
  );
}
