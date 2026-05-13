import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  /**
   * Routes rely on these fields being present after the NextAuth callbacks copy
   * GitHub identity/token data into the session.
   */
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  /** JWT carries GitHub data between the OAuth callback and server routes. */
  interface JWT {
    accessToken?: string;
    id?: string;
    /** Stable GitHub ID, kept separate from mutable login/name fields. */
    githubId?: string;
  }
}
