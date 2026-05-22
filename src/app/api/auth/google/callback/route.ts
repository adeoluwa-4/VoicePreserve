import { issueCsrfToken } from "@/lib/auth/csrf";
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  signInWithGoogleProfileWithoutDatabase,
  signInWithGoogleProfile,
  validateGoogleState
} from "@/lib/auth/google-oauth";
import { recordAuditEvent } from "@/lib/services/audit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";

  if (!code) {
    return Response.redirect(`${process.env.APP_URL ?? "http://localhost:3000"}/auth?authError=missing_code`, 302);
  }

  const validState = await validateGoogleState(state);
  if (!validState) {
    return Response.redirect(`${process.env.APP_URL ?? "http://localhost:3000"}/auth?authError=invalid_state`, 302);
  }

  try {
    const token = await exchangeGoogleCode(code);
    const profile = await fetchGoogleProfile(token.access_token);
    let user;

    try {
      user = await signInWithGoogleProfile(profile, token);
    } catch {
      user = await signInWithGoogleProfileWithoutDatabase(profile);
    }

    await issueCsrfToken();

    await recordAuditEvent({
      userId: user.id,
      actorType: "USER",
      eventName: "auth.google_login",
      eventPayload: {
        provider: "google",
        email: user.email
      }
    });

    return Response.redirect(`${process.env.APP_URL ?? "http://localhost:3000"}/preview`, 302);
  } catch {
    return Response.redirect(`${process.env.APP_URL ?? "http://localhost:3000"}/auth?authError=google_login_failed`, 302);
  }
}
