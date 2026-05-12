import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

const githubId = process.env.AUTH_GITHUB_ID;
const githubSecret = process.env.AUTH_GITHUB_SECRET;
const isTestMode = process.env.TEST_MODE === "true";

// Validate OAuth credentials at startup.
if (!isTestMode && (!githubId || !githubSecret)) {
  throw new Error("Missing AUTH_GITHUB_ID or AUTH_GITHUB_SECRET");
}

export const { handlers, auth } = NextAuth({
  providers: [
    // GitHub OAuth provider credentials come from local env vars.
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
        // Mirror token fields into session so UI can show profile details.
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = (token.picture as string | undefined) ?? undefined;
      }
      return session;
    },
  },
});
