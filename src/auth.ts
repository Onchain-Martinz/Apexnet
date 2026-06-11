import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
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

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            hashedPassword: true,
            isActive: true,
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
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // `user` is only present on the initial sign-in
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      // NextAuth v5 beta: JWT extends Record<string,unknown>, so token.role resolves to
      // unknown despite the next-auth/jwt augmentation. Cast through unknown explicitly.
      session.user.role = token.role as Role;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/signup",
  },
});
