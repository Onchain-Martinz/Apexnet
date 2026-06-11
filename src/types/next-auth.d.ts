import type { Role } from "@prisma/client";

// Augment NextAuth's built-in types so `session.user.role` and
// `session.user.id` are fully typed everywhere in the codebase.

declare module "next-auth" {
  interface User {
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image?: string | null;
      role: Role;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
