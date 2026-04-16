import { mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { Worker } from "bullmq";
import { redisConnection } from "../connection";
import {
  IMAGE_OPTIMIZE_QUEUE_NAME,
  imageOptimizedJobData,
} from "../queues/imageOptimizeQueue";

export const imageOptimizedWorker = new Worker<imageOptimizedJobData>(
  IMAGE_OPTIMIZE_QUEUE_NAME,
  async (job) => {
    const { fileName, sourcePath, outputDir, width = 600 } = job.data;

    await mkdir(outputDir, { recursive: true });

    const optimizedFileName = `${path.parse(fileName).name}.webp`;
    const optimizedPath = path.join(outputDir, optimizedFileName);

    await sharp(sourcePath)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(optimizedPath);

    return { optimizedPath };
  },
  {
    connection: redisConnection,
  },
);

imageOptimizedWorker.on("completed", (job) => {
  console.log(`[image-optimize] completed job=${job.id}`);
});

imageOptimizedWorker.on("failed", (job, error) => {
  console.error(
    `[image-optimize] failed job=${job?.id ?? "unknown"}: ${error.message}`,
  );
});
