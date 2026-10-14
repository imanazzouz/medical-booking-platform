import Redis from "ioredis";
import { createHmac } from "node:crypto";
import { getEnv } from "@/lib/env";
import { RateLimitError, ServiceUnavailableError } from "@/lib/http/errors";

let redis: Redis | undefined;
let redisConnect: Promise<void> | null = null;
function client(): Redis {
  if (!redis) redis = new Redis(getEnv().REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 2_000, commandTimeout: 2_000 });
  return redis;
}

const fixedWindowLua = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return { count, redis.call('TTL', KEYS[1]) }
`;

export async function pingRateLimitStore(): Promise<void> {
  const r = client();
  if (r.status === "wait") {
    redisConnect ??= r.connect().finally(() => { redisConnect = null; });
    await redisConnect;
  }
  await r.ping();
}

export async function enforceRateLimit(scope: string, identity: string, limit: number, windowSeconds: number): Promise<void> {
  const keyHash = createHmac("sha256", getEnv().OTP_PEPPER).update(identity).digest("hex");
  try {
    const r = client();
    if (r.status === "wait") {
      redisConnect ??= r.connect().finally(() => { redisConnect = null; });
      await redisConnect;
    }
    const result = await r.eval(fixedWindowLua, 1, `rl:${scope}:${keyHash}`, String(windowSeconds)) as [number, number];
    if (Number(result[0]) > limit) throw new RateLimitError(Math.max(1, Number(result[1])));
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    // Fail closed in production; auth throttling must not silently degrade to per-process memory.
    throw new ServiceUnavailableError();
  }
}
