import { Worker } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@/lib/db/prisma";
import { buildExportContent, completeExportJob, failExportJob } from "@/lib/services/export";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error("REDIS_URL not set; export worker not started.");
  process.exit(1);
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

new Worker(
  "export-jobs",
  async (job) => {
    const exportJobId = String(job.data.exportJobId);
    await prisma.exportJob.update({ where: { id: exportJobId }, data: { status: "PROCESSING" } });

    try {
      const exportJob = await prisma.exportJob.findUnique({ where: { id: exportJobId } });
      if (!exportJob) {
        throw new Error("Export job not found");
      }

      const { filename, content, mimeType } = await buildExportContent(exportJob);
      await completeExportJob(exportJobId, content, filename, mimeType);
    } catch (error) {
      await failExportJob(exportJobId, error);
      throw error;
    }
  },
  { connection }
);

console.log("VoicePreserve export worker is running.");
