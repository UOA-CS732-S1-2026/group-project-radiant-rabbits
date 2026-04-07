import NextAuth from "next-auth";
import { options } from "./options";

// Build the auth handler.
const handler = NextAuth(options);

// App Router expects method exports for auth endpoints.
export { handler as GET, handler as POST };
