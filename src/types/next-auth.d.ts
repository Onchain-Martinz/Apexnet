import type { Role } from "@prisma/client";

// Augment NextAuth's built-in types so `session.user.role` and
// `session.user.id` are fully typed everywhere in the codebase.

declare module "next-auth" {
  interface User {
    role: Role;
    emailVerifiedAt: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image?: string | null;
      role: Role;
      emailVerifiedAt: string | null;
      // Present only while an admin is impersonating this user.
      impersonatorId?: string;
      impersonatorRole?: Role;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    emailVerifiedAt: string | null;
    impersonatorId?: string;
    impersonatorRole?: Role;
  }
}
