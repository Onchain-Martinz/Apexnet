import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Edge-safe base config — used directly by middleware (which runs on the
// Edge runtime) and spread into the full Node config in src/auth.ts.
//
// No providers, no adapter, no bcrypt/db imports here: middleware only ever
// reads an already-encoded session via auth() — it decodes the JWT and runs
// the session() callback below, and never triggers jwt()/signIn(), so it
// never needs the Node-only pieces that live in src/auth.ts.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.emailVerifiedAt = token.emailVerifiedAt as string | null;
      session.user.mustChangePassword = token.mustChangePassword as boolean;
      session.user.profileComplete = token.profileComplete as boolean;
      // Present only while an admin is impersonating this user (see /api/admin/impersonate).
      session.user.impersonatorId = token.impersonatorId as string | undefined;
      session.user.impersonatorRole = token.impersonatorRole as Role | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/complete-profile",
  },
};

export const { auth } = NextAuth(authConfig);
