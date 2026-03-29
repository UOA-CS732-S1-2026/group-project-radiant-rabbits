import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const githubId = process.env.AUTH_GITHUB_ID;
const githubSecret = process.env.AUTH_GITHUB_SECRET;

// Validate OAuth credentials at startup.
if (!githubId || !githubSecret) {
  throw new Error("Missing AUTH_GITHUB_ID or AUTH_GITHUB_SECRET");
}

// Shared NextAuth config used by the auth route and server session checks.
export const options: NextAuthOptions = {
  providers: [
    // GitHub is the only enabled sign-in provider for this app.
    GitHubProvider({
      clientId: githubId,
      clientSecret: githubSecret,
    }),
  ],
  pages: {
    signIn: "/",
  },
};
