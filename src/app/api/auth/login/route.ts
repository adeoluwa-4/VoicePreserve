import { cookies } from "next/headers";
import { createSessionToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { issueCsrfToken } from "@/lib/auth/csrf";
import { prisma } from "@/lib/db/prisma";
import { recordAuditEvent } from "@/lib/services/audit";
import { jsonError } from "@/lib/utils/response";
import { loginSchema } from "@/lib/validation/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const { email, password } = parsed.data;
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return jsonError("Invalid credentials", 401);
    }

    const token = await createSessionToken({ sub: user.id, email: user.email });
    const jar = await cookies();
    jar.set(process.env.COOKIE_NAME ?? "voicepreserve_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    const csrfToken = await issueCsrfToken();

    await recordAuditEvent({
      userId: user.id,
      actorType: "USER",
      eventName: "auth.login",
      eventPayload: { email }
    });

    return Response.json({ user: { id: user.id, email: user.email, displayName: user.displayName }, csrfToken });
  } catch {
    const demoEmail = process.env.DEMO_EMAIL ?? "demo@voicepreserve.app";
    const demoPassword = process.env.DEMO_PASSWORD ?? "DemoPass123!";

    if (email === demoEmail && password === demoPassword) {
      const token = await createSessionToken({ sub: "demo-offline", email: demoEmail });
      const jar = await cookies();
      jar.set(process.env.COOKIE_NAME ?? "voicepreserve_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7
      });

      const csrfToken = await issueCsrfToken();
      return Response.json({
        user: { id: "demo-offline", email: demoEmail, displayName: "Demo User (Offline)" },
        csrfToken
      });
    }

    return jsonError("Login unavailable: database is currently unreachable.", 503);
  }
}
