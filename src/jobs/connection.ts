import IORedis from "ioredis";

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: toNumber(process.env.REDIS_PORT, 6379),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  db: toNumber(process.env.REDIS_DB, 0),
  maxRetriesPerRequest: null,
});
