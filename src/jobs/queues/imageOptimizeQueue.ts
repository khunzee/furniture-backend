import { Queue } from "bullmq";
import { redisConnection } from "../connection";

export const IMAGE_OPTIMIZE_QUEUE_NAME = "image-optimize";

export type imageOptimizedJobData = {
  fileName: string;
  sourcePath: string;
  outputDir: string;
  width?: number;
};

export const imageOptimizedQueue = new Queue(
  IMAGE_OPTIMIZE_QUEUE_NAME,
  {
    connection: redisConnection,
  },
);

