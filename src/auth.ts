import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

const githubId = process.env.AUTH_GITHUB_ID;
const githubSecret = process.env.AUTH_GITHUB_SECRET;
const e2eTestMode = process.env.E2E_TEST_MODE === "true";

// Validate OAuth credentials at startup (skip in test mode or during build).
if (
  !e2eTestMode &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  (!githubId || !githubSecret)
) {
  throw new Error("Missing AUTH_GITHUB_ID or AUTH_GITHUB_SECRET");
}

const providers = [];

// Add GitHub provider for production
if (githubId && githubSecret) {
  providers.push(
    GitHub({
      clientId: githubId,
      clientSecret: githubSecret,
    }),
  );
}

// Add test credentials for E2E testing
if (e2eTestMode) {
  providers.push(
    Credentials({
      name: "Test Sign In",
      credentials: {
        // No credentials form in test mode - just a button
      },
      async authorize() {
        // Return a fixed test user
        return {
          id: process.env.E2E_TEST_USER_ID || "smoke-user-1",
          name: "Test User",
          email: "test@example.com",
          image: undefined,
        };
      },
    }),
  );
}

export const { handlers, auth } = NextAuth({
  providers,
  pages: {
    signIn: "/",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        // Mirror token fields into session so UI can show profile details.
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = (token.picture as string | undefined) ?? undefined;
      }
      return session;
    },
  },
});
