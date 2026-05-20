import crypto from "node:crypto";
import { cookies } from "next/headers";

function csrfCookieName() {
  return "vp_csrf";
}

export async function issueCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set(csrfCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
  return token;
}

export async function validateCsrf(request: Request): Promise<boolean> {
  const headerToken = request.headers.get("x-csrf-token");
  const jar = await cookies();
  const cookieToken = jar.get(csrfCookieName())?.value;
  return Boolean(headerToken && cookieToken && headerToken === cookieToken);
}
