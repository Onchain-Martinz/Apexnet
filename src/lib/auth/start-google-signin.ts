import { signOut, signIn } from "next-auth/react";

// Auth.js links a new OAuth identity onto whatever session is already active
// in the browser (see @auth/core's handleLoginOrRegister: if a valid session
// exists, it calls linkAccount() against that session's user, with no check
// that the incoming Google profile's email matches). If a stale ApexNet
// session is present when "Continue with Google" is clicked, that silently
// attaches the new Google account to the wrong existing user instead of
// creating/signing into one for the Google account itself. Every Google
// entry point on the public auth flow must start from a signed-out browser
// state to prevent this.
//
// signOut() is a safe no-op when there's no active session (@auth/core's
// signout handler returns immediately if there's no session cookie), so it's
// called unconditionally here rather than pre-checking with getSession() —
// one fewer round trip, same protection.
export async function startGoogleSignIn(callbackUrl: string) {
  await signOut({ redirect: false });
  await signIn("google", { callbackUrl });
}
