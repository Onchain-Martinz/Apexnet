import { getSession, signOut, signIn } from "next-auth/react";

// Auth.js links a new OAuth identity onto whatever session is already active
// in the browser (see @auth/core's handleLoginOrRegister: if a valid session
// exists, it calls linkAccount() against that session's user, with no check
// that the incoming Google profile's email matches). If a stale ApexNet
// session is present when "Continue with Google" is clicked, that silently
// attaches the new Google account to the wrong existing user instead of
// creating/signing into one for the Google account itself. Every Google
// entry point on the public auth flow must start from a signed-out browser
// state to prevent this.
export async function startGoogleSignIn(callbackUrl: string) {
  const session = await getSession();
  if (session) {
    await signOut({ redirect: false });
  }
  await signIn("google", { callbackUrl });
}
