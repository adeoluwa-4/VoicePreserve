import { Queue } from "bullmq";
import IORedis from "ioredis";

let queue: Queue | null = null;

function getConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null
  });
}

export function getExportQueue() {
  if (queue) {
    return queue;
  }

  const connection = getConnection();
  if (!connection) {
    return null;
  }

  queue = new Queue("export-jobs", { connection });
  return queue;
}
