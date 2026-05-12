import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { normalizeUserRef } from "@/app/lib/userRef";

const githubId = process.env.AUTH_GITHUB_ID;
const githubSecret = process.env.AUTH_GITHUB_SECRET;
const isTestMode = process.env.TEST_MODE === "true";
const testUserId = process.env.TEST_USER_ID ?? "test-user";
const testUserName = process.env.TEST_USER_NAME ?? "Playwright Test User";
const testUserEmail = process.env.TEST_USER_EMAIL ?? "playwright@test.local";

if (!isTestMode && (!githubId || !githubSecret)) {
  throw new Error("Missing AUTH_GITHUB_ID or AUTH_GITHUB_SECRET");
}

export const options: NextAuthOptions = {
  providers: [
    ...(isTestMode
      ? [
          CredentialsProvider({
            id: "test-login",
            name: "Test Login",
            credentials: {},
            async authorize() {
              return {
                id: testUserId,
                name: testUserName,
                email: testUserEmail,
                image: null,
              };
            },
          }),
        ]
      : []),
    ...(!isTestMode && githubId && githubSecret
      ? [
          GitHubProvider({
            clientId: githubId,
            clientSecret: githubSecret,
            authorization: {
              params: {
                // 1. Request 'repo' and 'read:project' scopes so we can read GitHub Projects
                scope: "read:user user:email repo read:project",
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    // 2. Capture the token from the account when the user signs in
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "test-login") {
        token.id = (user?.id as string | undefined) ?? testUserId;
        token.name = user?.name ?? testUserName;
        token.email = user?.email ?? testUserEmail;
        delete token.accessToken;
        return token;
      }

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
                $setOnInsert: {
                  currentGroupId: null,
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
    async session({ session, token }: { session: Session; token: JWT }) {
      const sessionWithToken = session as Session & { accessToken?: string };
      sessionWithToken.accessToken = token.accessToken;
      if (sessionWithToken.user && token.id) {
        (sessionWithToken.user as { id: string }).id = token.id;
      }
      return sessionWithToken;
    },
  },
  pages: {
    signIn: "/",
  },
};
