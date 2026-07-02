"use client";

import { useSearchParams } from "next/navigation";

// Maps ?error= codes emitted by the Google signIn flow to user-facing copy.
// Shared by /login and /signup so the messaging stays identical.
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  email_exists_password:
    "This email already has an Apex account created with password sign-in. Please log in with your email and password.",
  google_no_email: "We couldn't read an email from your Google account. Please try another method.",
  google_failed: "Google sign-in failed. Please try again.",
};

// Reads the auth error code from the URL and renders the matching banner.
// Uses useSearchParams, so the caller MUST wrap it in a <Suspense> boundary.
export function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const code = searchParams.get("error");
  const message = code ? AUTH_ERROR_MESSAGES[code] : undefined;
  if (!message) return null;

  return (
    <div
      className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive animate-slide-down"
      role="alert"
    >
      {message}
    </div>
  );
}
