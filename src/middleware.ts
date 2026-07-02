import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  LECTURER: "/lecturer",
  ADMIN: "/admin",
};

const AUTH_PAGES = ["/login", "/signup"];
const PUBLIC_PAGES = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/admin/setup", "/api/admin/bootstrap"];
const VERIFY_EMAIL_PAGE = "/verify-email";
const COMPLETE_PROFILE_PAGE = "/complete-profile";

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

  // Onboarding (/complete-profile) is ONLY for genuine new OAuth accounts:
  //   • profile not yet complete, AND
  //   • passwordless (Google users are created with hashedPassword = null), AND
  //   • not an ADMIN, AND
  //   • not an impersonated session.
  // The passwordless + non-ADMIN checks are what stop legacy/credentials
  // accounts (whose profileComplete may be false for historical reasons) from
  // ever being funneled into role onboarding and silently rewritten.
  const isOnboardingCandidate =
    isLoggedIn &&
    session?.user?.profileComplete === false &&
    session?.user?.hasPassword === false &&
    role !== "ADMIN" &&
    !session?.user?.impersonatorId;

  // Onboarding candidate anywhere but the page itself → send them to finish it.
  if (isOnboardingCandidate && path !== COMPLETE_PROFILE_PAGE) {
    return NextResponse.redirect(new URL(COMPLETE_PROFILE_PAGE, req.url));
  }

  // Anyone who is NOT an onboarding candidate (already complete, ADMIN, or a
  // legacy password account) must never sit on /complete-profile → dashboard.
  if (isLoggedIn && !isOnboardingCandidate && path === COMPLETE_PROFILE_PAGE) {
    const home = role ? ROLE_HOME[role] : "/student";
    return NextResponse.redirect(new URL(home, req.url));
  }

  // Unverified user → hard-gate to /verify-email until they verify their
  // email. Deferred entirely while a forced password change is pending
  // (mustChangePassword) — the dashboard loads with a blocking client-side
  // modal instead (see (dashboard)/layout.tsx); verification is prompted
  // only after the password has been changed. Also suppressed while an
  // admin is impersonating (impersonatorId set) — this reflects the target
  // lecturer's real pending-verification state, not the admin's own, and
  // would otherwise redirect the admin's impersonated session away from the
  // dashboard mid-onboarding. Real lecturer-owned sessions are unaffected.
  if (
    isLoggedIn &&
    !session?.user?.mustChangePassword &&
    !session?.user?.emailVerifiedAt &&
    !session?.user?.impersonatorId &&
    path !== VERIFY_EMAIL_PAGE
  ) {
    return NextResponse.redirect(new URL(VERIFY_EMAIL_PAGE, req.url));
  }

  // Verified user hitting /verify-email → send to their dashboard
  if (isLoggedIn && session?.user?.emailVerifiedAt && path === VERIFY_EMAIL_PAGE) {
    const home = role ? ROLE_HOME[role] : "/student";
    return NextResponse.redirect(new URL(home, req.url));
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
