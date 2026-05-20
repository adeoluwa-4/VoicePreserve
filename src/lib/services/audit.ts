import { AuditActorType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function recordAuditEvent(input: {
  userId?: string;
  projectId?: string;
  actorType: AuditActorType;
  eventName: string;
  eventPayload: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  await prisma.auditEvent.create({
    data: {
      userId: input.userId,
      projectId: input.projectId,
      actorType: input.actorType,
      eventName: input.eventName,
      eventPayload: input.eventPayload as Prisma.InputJsonValue,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    }
  });
}
