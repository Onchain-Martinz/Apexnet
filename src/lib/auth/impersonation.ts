import { encode } from "next-auth/jwt";
import type { Role } from "@prisma/client";

const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days — matches NextAuth default

interface SessionTokenUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  emailVerifiedAt: Date | null;
}

// Mints a NextAuth v5 JWT session token for `user`, optionally tagging it
// with the admin who initiated impersonation so the session can later
// "Return to Admin".
export async function createSessionToken(
  user: SessionTokenUser,
  impersonator?: { id: string; role: Role },
) {
  return encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      impersonatorId: impersonator?.id,
      impersonatorRole: impersonator?.role,
    },
    secret: process.env.NEXTAUTH_SECRET!,
    salt: SESSION_COOKIE_NAME,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
