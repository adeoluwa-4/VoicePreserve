import { buildGoogleAuthUrl, createGoogleState } from "@/lib/auth/google-oauth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const state = await createGoogleState();
    const url = buildGoogleAuthUrl(state);
    return Response.redirect(url, 302);
  } catch {
    return Response.redirect(`${process.env.APP_URL ?? "http://localhost:3000"}/auth?authError=google_not_configured`, 302);
  }
}
