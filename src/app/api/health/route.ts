import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "up", timestamp: new Date().toISOString() });
  } catch {
    return Response.json({ status: "degraded", db: "down" }, { status: 503 });
  }
}
