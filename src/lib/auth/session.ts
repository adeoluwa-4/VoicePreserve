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
    try {
      const dbUser = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (dbUser) {
        return dbUser;
      }
    } catch {
      // Fall back below when the database is unreachable.
    }

    if (payload.sub.startsWith("google:")) {
      return {
        id: payload.sub,
        email: payload.email,
        displayName: payload.email.split("@")[0],
        passwordHash: "",
        timezone: "UTC",
        locale: "en-US",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };
    }

    return null;
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
