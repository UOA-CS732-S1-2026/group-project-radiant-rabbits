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
                // Repo and Project scopes are required because sprint data comes
                // from private repositories and GitHub Projects v2 fields.
                scope: "read:user user:email repo read:project",
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "test-login") {
        // Test sessions intentionally omit a GitHub access token so Playwright
        // flows cannot accidentally call live GitHub APIs.
        token.id = (user?.id as string | undefined) ?? testUserId;
        token.name = user?.name ?? testUserName;
        token.email = user?.email ?? testUserEmail;
        delete token.accessToken;
        return token;
      }

      if (account) {
        // Server routes reuse the OAuth token for repository access checks and
        // sync calls, so it has to survive beyond the initial callback.
        token.accessToken = account.access_token;
        token.id = account.providerAccountId;

        // Keep User collection aligned with authenticated GitHub users.
        try {
          await connectMongoDB();

          // The stable GitHub id is used as the bridge between NextAuth sessions
          // and Mongo references so login/name changes do not orphan records.
          const githubId = account.providerAccountId;
          const userId = normalizeUserRef(githubId);
          // Read useful fields from GitHub profile payload.
          const githubProfile = profile as {
            login?: string;
            name?: string;
            email?: string;
            avatar_url?: string;
          } | null;

          // GitHub may hide email/name fields; deterministic fallbacks keep user
          // creation reliable without inventing mutable placeholder identities.
          const login = githubProfile?.login?.trim() || githubId;
          const name = githubProfile?.name?.trim() || login;
          const email =
            githubProfile?.email?.trim().toLowerCase() ||
            `${githubId}@users.noreply.github.local`;
          const avatarUrl = githubProfile?.avatar_url?.trim() || null;

          if (userId) {
            // Upserting on sign-in keeps profile fields fresh while preserving
            // currentGroupId for returning users.
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
    async session({ session, token }: { session: Session; token: JWT }) {
      // API routes read these fields from the session rather than re-querying
      // NextAuth internals on every request.
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
