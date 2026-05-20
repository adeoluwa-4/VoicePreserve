import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function DELETE() {
  const user = await requireSessionUser();

  await prisma.$transaction([
    prisma.auditEvent.deleteMany({ where: { userId: user.id } }),
    prisma.exportJob.deleteMany({ where: { userId: user.id } }),
    prisma.transparencyReport.deleteMany({ where: { userId: user.id } }),
    prisma.revision.deleteMany({ where: { userId: user.id } }),
    prisma.voiceProfile.deleteMany({ where: { userId: user.id } }),
    prisma.writingSample.deleteMany({ where: { userId: user.id } }),
    prisma.project.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } })
  ]);

  return Response.json({ ok: true });
}
