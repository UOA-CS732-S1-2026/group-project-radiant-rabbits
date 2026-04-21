import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { normalizeUserRef } from "@/app/lib/userRef";

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
    async jwt({ token, account, profile }) {
      if (account) {
        // Keep token values used by server routes.
        token.accessToken = account.access_token;
        token.id = account.providerAccountId;

        // Keep User collection aligned with authenticated GitHub users.
        try {
          await connectMongoDB();

          // Use stable GitHub id for both token and Mongo user id.
          const githubId = account.providerAccountId;
          const userId = normalizeUserRef(githubId);
          // Read useful fields from GitHub profile payload.
          const githubProfile = profile as {
            login?: string;
            name?: string;
            email?: string;
            avatar_url?: string;
          } | null;

          // Fallbacks prevent validation failures on missing profile fields.
          const login = githubProfile?.login?.trim() || githubId;
          const name = githubProfile?.name?.trim() || login;
          const email =
            githubProfile?.email?.trim().toLowerCase() ||
            `${githubId}@users.noreply.github.local`;
          const avatarUrl = githubProfile?.avatar_url?.trim() || null;

          if (userId) {
            // Upsert keeps existing users updated and creates new users on first login.
            await User.findOneAndUpdate(
              { _id: userId },
              {
                $set: {
                  githubId,
                  login,
                  name,
                  email,
                  avatarUrl,
                },
              },
              {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
              },
            );
          }
        } catch (error) {
          // Auth should continue even if profile persistence temporarily fails.
          console.error("Failed to upsert user during sign-in:", error);
        }
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
