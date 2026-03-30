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
  callbacks: {
    async jwt({ token, user }) {
      // On first sign in, the `user` object is available.
      if (user?.id) {
        token.githubId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // The session callback is called whenever a session is checked.
      // We add the github id to the session object, so we can access it in our app.
      if (session.user) {
        session.user.id = (token.githubId as string) ?? token.sub ?? "";
      }
      return session;
    },
  },
};
