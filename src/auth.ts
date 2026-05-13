import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

const githubId = process.env.AUTH_GITHUB_ID;
const githubSecret = process.env.AUTH_GITHUB_SECRET;
const isTestMode = process.env.TEST_MODE === "true";

// Fail fast in real deployments so authentication misconfiguration is caught
// before users hit a broken sign-in flow.
if (!isTestMode && (!githubId || !githubSecret)) {
  throw new Error("Missing AUTH_GITHUB_ID or AUTH_GITHUB_SECRET");
}

export const { handlers, auth } = NextAuth({
  providers: [
    // Test mode uses the App Router NextAuth options instead, so this provider
    // is only registered when real GitHub credentials exist.
    ...(githubId && githubSecret
      ? [
          GitHub({
            clientId: githubId,
            clientSecret: githubSecret,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        // Keep the session self-contained for UI chrome that only needs basic
        // profile details and should not query Mongo on every render.
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = (token.picture as string | undefined) ?? undefined;
      }
      return session;
    },
  },
});
