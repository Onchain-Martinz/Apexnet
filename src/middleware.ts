import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  LECTURER: "/lecturer",
  ADMIN: "/admin",
};

const AUTH_PAGES = ["/login", "/signup"];
const PUBLIC_PAGES = ["/", "/login", "/signup"];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role as Role | undefined;
  const path = nextUrl.pathname;

  const isAuthPage = AUTH_PAGES.includes(path);
  const isPublicPage = PUBLIC_PAGES.includes(path);

  // Authenticated user hitting a login/signup page → send to their dashboard
  if (isLoggedIn && isAuthPage) {
    const home = role ? ROLE_HOME[role] : "/student";
    return NextResponse.redirect(new URL(home, req.url));
  }

  // Unauthenticated user hitting a protected route → send to login
  if (!isLoggedIn && !isPublicPage) {
    const loginUrl = new URL("/login", req.url);
    // Preserve the intended destination so we can redirect back after login
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting the wrong role's section → send to their home
  if (isLoggedIn && role) {
    if (path.startsWith("/student") && role !== "STUDENT") {
      return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
    }
    if (path.startsWith("/lecturer") && role !== "LECTURER") {
      return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
    }
    if (path.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  // Run on every route EXCEPT Next.js internals and static assets
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|icons|fonts|manifest).*)"],
};
