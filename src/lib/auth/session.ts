import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { verifySessionToken } from "@/lib/auth/jwt";

function cookieName() {
  return process.env.COOKIE_NAME ?? "voicepreserve_session";
}

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(cookieName())?.value;
  if (!token) {
    return null;
  }

  try {
    const payload = await verifySessionToken(token);
    return prisma.user.findUnique({ where: { id: payload.sub } });
  } catch {
    return null;
  }
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user || user.deletedAt) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
