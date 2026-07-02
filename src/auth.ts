import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { authConfig } from "@/auth.config";
import type { Role } from "@prisma/client";

// PrismaAdapter expects an `emailVerified` column; our schema uses `emailVerifiedAt`.
// Override the two write methods (createUser, updateUser) that would otherwise
// attempt to set the non-existent `emailVerified` column and break Prisma.
// All read methods (getUserByEmail, getUserByAccount) return our User rows
// without an `emailVerified` key — that's fine because the jwt callback does
// its own DB lookup for OAuth sign-ins and ignores the adapter-level field.
const baseAdapter = PrismaAdapter(db);
const adapter = {
  ...baseAdapter,

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createUser(data: any) {
    const user = await db.user.create({
      data: {
        email: data.email as string,
        name: (data.name as string | null) ?? undefined,
        avatarUrl: (data.image as string | null) ?? undefined,
        emailVerifiedAt: (data.emailVerified as Date | null) ?? null,
        profileComplete: false,
      },
    });
    return { ...user, emailVerified: user.emailVerifiedAt, image: user.avatarUrl };
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateUser(data: any) {
    const { id, emailVerified, image, name } = data as {
      id: string;
      emailVerified?: Date | null;
      image?: string | null;
      name?: string | null;
    };
    const user = await db.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(image !== undefined && { avatarUrl: image }),
        ...(emailVerified !== undefined && { emailVerifiedAt: emailVerified }),
      },
    });
    return { ...user, emailVerified: user.emailVerifiedAt, image: user.avatarUrl };
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: adapter as any,

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Allow a Google email that matches an existing credentials account to
      // link rather than failing with "account already exists".
      allowDangerousEmailAccountLinking: true,
    }),

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
            mustChangePassword: true,
            profileComplete: true,
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
          mustChangePassword: user.mustChangePassword,
          profileComplete: user.profileComplete,
        };
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account }) {
      // Credentials sign-ins are fully handled by authorize(); only gate OAuth.
      if (account?.provider !== "google") return true;

      // Block inactive accounts from signing in with Google.
      const dbUser = await db.user.findUnique({
        where: { id: user.id as string },
        select: { isActive: true },
      });
      // If user not found in DB the adapter has already created them — allow.
      return !dbUser || dbUser.isActive;
    },

    async jwt({ token, user, account, trigger }) {
      // `user` is only present on the initial sign-in.
      if (user) {
        token.id = user.id as string;

        if (account?.type === "oauth" || account?.type === "oidc") {
          // For OAuth sign-ins the adapter only returns standard fields
          // (id, name, email, image). Fetch all custom claims from DB.
          const dbUser = await db.user.findUnique({
            where: { id: user.id as string },
            select: {
              role: true,
              emailVerifiedAt: true,
              mustChangePassword: true,
              profileComplete: true,
            },
          });

          // OAuth providers authenticate the email themselves; Auth.js still
          // creates the row with emailVerifiedAt null, so promote it here on
          // the first sign-in rather than forcing an OTP Google already did.
          let emailVerifiedAt = dbUser?.emailVerifiedAt ?? null;
          if (dbUser && !emailVerifiedAt) {
            emailVerifiedAt = new Date();
            await db.user.update({
              where: { id: user.id as string },
              data: { emailVerifiedAt },
            });
          }

          token.role = (dbUser?.role ?? "STUDENT") as Role;
          token.emailVerifiedAt = emailVerifiedAt?.toISOString() ?? null;
          token.mustChangePassword = dbUser?.mustChangePassword ?? false;
          token.profileComplete = dbUser?.profileComplete ?? false;
        } else {
          // Credentials authorize() returns all custom fields directly.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const u = user as any;
          token.role = u.role as Role;
          token.emailVerifiedAt = u.emailVerifiedAt as string | null;
          token.mustChangePassword = u.mustChangePassword as boolean;
          token.profileComplete = u.profileComplete as boolean;
        }
      }

      // Re-fetch mutable claims when the client calls update()
      // (e.g. after OTP verification, password change, or profile completion).
      if (trigger === "update") {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            emailVerifiedAt: true,
            mustChangePassword: true,
            profileComplete: true,
          },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.emailVerifiedAt = dbUser.emailVerifiedAt?.toISOString() ?? null;
          token.mustChangePassword = dbUser.mustChangePassword;
          token.profileComplete = dbUser.profileComplete;
        }
      }

      return token;
    },
    // session() is inherited from authConfig — same shape as before
    // (id, role, emailVerifiedAt, mustChangePassword, profileComplete,
    // impersonatorId, impersonatorRole), just defined once instead of twice.
  },
});
