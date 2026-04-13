import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const githubId = process.env.AUTH_GITHUB_ID;
const githubSecret = process.env.AUTH_GITHUB_SECRET;

if (!githubId || !githubSecret) {
  throw new Error("Missing AUTH_GITHUB_ID or AUTH_GITHUB_SECRET");
}

export const options: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: githubId,
      clientSecret: githubSecret,
      authorization: {
        params: {
          // 1. Request 'repo' scope to see private and public repos
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  callbacks: {
    // 2. Capture the token from the account when the user signs in
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.id = account.providerAccountId;
      }
      return token;
    },
    // 3. Pass that token into the session so it's accessible in your pages
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      if (session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
