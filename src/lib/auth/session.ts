import { auth } from "@/auth";
import type { Role } from "@prisma/client";

// Use in Server Components and Route Handlers.
// Returns null if the user is not authenticated.
export async function getSession() {
  return auth();
}

// Throws if unauthenticated. Use at the top of protected server actions.
export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session;
}

// Throws if the user does not have the required role.
export async function requireRole(role: Role) {
  const session = await requireSession();
  if (session.user.role !== role) throw new Error("FORBIDDEN");
  return session;
}
