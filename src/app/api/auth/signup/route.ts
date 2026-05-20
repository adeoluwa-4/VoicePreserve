import { cookies } from "next/headers";
import { createSessionToken } from "@/lib/auth/jwt";
import { hashPassword } from "@/lib/auth/password";
import { issueCsrfToken } from "@/lib/auth/csrf";
import { prisma } from "@/lib/db/prisma";
import { recordAuditEvent } from "@/lib/services/audit";
import { jsonError } from "@/lib/utils/response";
import { signupSchema } from "@/lib/validation/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const { email, password, displayName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError("Email already registered", 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName
    }
  });

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
    eventName: "auth.signup",
    eventPayload: { email }
  });

  return Response.json({ user: { id: user.id, email: user.email, displayName: user.displayName }, csrfToken });
}
