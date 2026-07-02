import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureException } from "@/lib/monitoring";
import type { Role } from "@prisma/client";

// Google is enabled only when its credentials are present, so local/preview
// environments without OAuth keys don't fail to boot. Credentials/OTP is
// always available.
const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  // No PrismaAdapter — pure JWT. Google users are persisted manually in the
  // signIn callback below (adapter-free) so we keep full control over the
  // "no email-linking" rule and the incomplete-profile onboarding lane.
  session: { strategy: "jwt" },

  providers: [
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // Explicitly forbid NextAuth's built-in email-based linking.
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),

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
    // Runs before jwt/session. For Google only, this enforces the account
    // rules and provisions brand-new users. Credentials pass straight through
    // (their vetting already happened in authorize()).
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.toLowerCase().trim();
      if (!email) return "/login?error=google_no_email";

      try {
        // A) Already-linked Google account → allow.
        const linked = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: account.providerAccountId,
            },
          },
          select: { id: true },
        });
        if (linked) return true;

        // B) Email already belongs to a (password) account with no Google
        // link → block. We never link Google to an existing account by email.
        const existingUser = await db.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (existingUser) {
          return "/login?error=email_exists_password";
        }

        // C) Brand-new Google user → provision minimal, email-verified,
        // profile-incomplete account + linked Google account + placeholder
        // student profile. No OTP is ever issued here.
        await db.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email,
              name: user.name ?? null,
              avatarUrl: user.image ?? null,
              role: "STUDENT",
              hashedPassword: null,
              emailVerifiedAt: new Date(),
              profileComplete: false,
            },
          });

          await tx.account.create({
            data: {
              userId: newUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state:
                account.session_state != null ? String(account.session_state) : null,
            },
          });

          await tx.studentProfile.create({
            data: { userId: newUser.id, universityId: null, departmentId: null, level: null },
          });
        });

        return true;
      } catch (err) {
        console.error("[GOOGLE_SIGNIN]", err);
        captureException(err);
        return "/login?error=google_failed";
      }
    },

    async jwt({ token, user, account, trigger }) {
      // Google sign-in: the `user` here is the Google profile (its `id` is the
      // Google sub, not our DB id), so enrich the token from our own DB row.
      if (account?.provider === "google") {
        type TokenUserFields = {
          id: string;
          role: Role;
          emailVerifiedAt: Date | null;
          mustChangePassword: boolean;
          profileComplete: boolean;
          hashedPassword: string | null;
        };
        let dbUser: TokenUserFields | null = null;

        // The linked `accounts` row is the canonical identity for a returning
        // Google user: providerAccountId is stable for the Google account,
        // whereas the email can change. signIn() already authorizes returning
        // Google users via this same account row, so jwt should enrich from
        // that same link first — resolving by email would break if the user's
        // Google email later changed.
        if (account.providerAccountId) {
          const linkedAccount = await db.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: account.providerAccountId,
              },
            },
            select: {
              user: {
                select: {
                  id: true,
                  role: true,
                  emailVerifiedAt: true,
                  mustChangePassword: true,
                  profileComplete: true,
                  hashedPassword: true,
                },
              },
            },
          });
          dbUser = linkedAccount?.user ?? null;
        }

        // Fallback: only if no account row was found, resolve by email.
        if (!dbUser && user?.email) {
          dbUser = await db.user.findUnique({
            where: { email: user.email.toLowerCase().trim() },
            select: {
              id: true,
              role: true,
              emailVerifiedAt: true,
              mustChangePassword: true,
              profileComplete: true,
              hashedPassword: true,
            },
          });
        }

        if (dbUser) {
          token.sub = dbUser.id;
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.emailVerifiedAt = dbUser.emailVerifiedAt
            ? dbUser.emailVerifiedAt.toISOString()
            : null;
          token.mustChangePassword = dbUser.mustChangePassword;
          token.profileComplete = dbUser.profileComplete;
          // Genuine Google onboarding accounts are passwordless. Middleware
          // uses this to distinguish them from legacy password accounts.
          token.hasPassword = dbUser.hashedPassword !== null;
        }
        return token;
      }

      // Credentials initial sign-in — `user` is only present here. A successful
      // credentials login always has a password (authorize() verified it), so
      // these accounts are never treated as onboarding candidates.
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.emailVerifiedAt = user.emailVerifiedAt;
        token.mustChangePassword = user.mustChangePassword;
        token.profileComplete = user.profileComplete;
        token.hasPassword = true;
      }

      // Re-fetch mutable state when the client calls `update()` — e.g. right
      // after OTP verification, a forced password change, or completing the
      // Google onboarding profile (role may flip STUDENT→LECTURER).
      if (trigger === "update") {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            emailVerifiedAt: true,
            mustChangePassword: true,
            profileComplete: true,
            hashedPassword: true,
          },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.emailVerifiedAt = dbUser.emailVerifiedAt
            ? dbUser.emailVerifiedAt.toISOString()
            : null;
          token.mustChangePassword = dbUser.mustChangePassword;
          token.profileComplete = dbUser.profileComplete;
          token.hasPassword = dbUser.hashedPassword !== null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      // NextAuth v5 beta: JWT extends Record<string,unknown>, so token.role resolves to
      // unknown despite the next-auth/jwt augmentation. Cast through unknown explicitly.
      session.user.role = token.role as Role;
      session.user.emailVerifiedAt = token.emailVerifiedAt as string | null;
      session.user.mustChangePassword = token.mustChangePassword as boolean;
      // Impersonation tokens (minted directly) omit this — default to true so
      // impersonated sessions are never bounced to /complete-profile.
      session.user.profileComplete = (token.profileComplete as boolean | undefined) ?? true;
      // Onboarding gate signal. Unknown (old tokens / impersonation) → default
      // true = "has a password" = not an onboarding candidate = never gated.
      session.user.hasPassword = (token.hasPassword as boolean | undefined) ?? true;
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
