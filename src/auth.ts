import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // No PrismaAdapter — pure credentials + JWT.
  // Add adapter back when OAuth providers are introduced.
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase().trim();

        // Per-account brute-force protection: 5 attempts / 15 minutes.
        const rateLimit = checkRateLimit(`login:${normalizedEmail}`, RATE_LIMITS.AUTH);
        if (!rateLimit.allowed) return null;

        const user = await db.user.findUnique({
          where: { email: normalizedEmail },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            hashedPassword: true,
            isActive: true,
            emailVerifiedAt: true,
          },
        });

        if (!user || !user.hashedPassword || !user.isActive) return null;

        const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      // `user` is only present on the initial sign-in
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.emailVerifiedAt = user.emailVerifiedAt;
      }

      // Re-fetch verification status when the client calls `update()`
      // (e.g. right after a successful OTP verification).
      if (trigger === "update") {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { emailVerifiedAt: true },
        });
        token.emailVerifiedAt = dbUser?.emailVerifiedAt ? dbUser.emailVerifiedAt.toISOString() : null;
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      // NextAuth v5 beta: JWT extends Record<string,unknown>, so token.role resolves to
      // unknown despite the next-auth/jwt augmentation. Cast through unknown explicitly.
      session.user.role = token.role as Role;
      session.user.emailVerifiedAt = token.emailVerifiedAt as string | null;
      // Present only while an admin is impersonating this user (see /api/admin/impersonate).
      session.user.impersonatorId = token.impersonatorId as string | undefined;
      session.user.impersonatorRole = token.impersonatorRole as Role | undefined;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/signup",
  },
});
