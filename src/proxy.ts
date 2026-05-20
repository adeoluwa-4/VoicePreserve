import { NextRequest, NextResponse } from "next/server";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const csrfBypassPaths = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/health"
]);

const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string): boolean {
  const max = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 120);
  const windowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60);
  const now = Date.now();
  const record = buckets.get(key);

  if (!record || record.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }

  if (record.count >= max) {
    return false;
  }

  record.count += 1;
  buckets.set(key, record);
  return true;
}

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`api:${ip}`)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  if (mutationMethods.has(request.method) && !csrfBypassPaths.has(request.nextUrl.pathname)) {
    const headerToken = request.headers.get("x-csrf-token");
    const cookieToken = request.cookies.get("vp_csrf")?.value;

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"]
};
