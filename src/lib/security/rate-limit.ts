import Redis from "ioredis";
import { Redis as UpstashRedis } from "@upstash/redis";
import { createHmac } from "node:crypto";
import { getEnv } from "@/lib/env";
import { RateLimitError, ServiceUnavailableError } from "@/lib/http/errors";

let redis: Redis | undefined;
let upstashRedis: UpstashRedis | undefined;
let redisConnect: Promise<void> | null = null;

const fixedWindowLua = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return { count, redis.call('TTL', KEYS[1]) }
`;

function usesUpstashRest(): boolean {
  const env = getEnv();
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

function restClient(): UpstashRedis {
  const env = getEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error("Upstash REST configuration is missing");
  }

  upstashRedis ??= new UpstashRedis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  return upstashRedis;
}

function tcpClient(): Redis {
  const env = getEnv();
  if (!env.REDIS_URL) throw new Error("REDIS_URL is missing");

  redis ??= new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 2_000,
    commandTimeout: 2_000,
  });

  return redis;
}

async function ensureTcpConnected(r: Redis): Promise<void> {
  if (r.status === "wait") {
    redisConnect ??= r.connect().finally(() => {
      redisConnect = null;
    });
    await redisConnect;
  }
}

export async function pingRateLimitStore(): Promise<void> {
  if (usesUpstashRest()) {
    await restClient().ping();
    return;
  }

  const r = tcpClient();
  await ensureTcpConnected(r);
  await r.ping();
}

export async function enforceRateLimit(
  scope: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  try {
    const env = getEnv();
    const keyHash = createHmac("sha256", env.OTP_PEPPER)
      .update(identity)
      .digest("hex");
    const key = `rl:${scope}:${keyHash}`;

    let result: unknown;

    if (usesUpstashRest()) {
      result = await restClient().eval<unknown[]>(
        fixedWindowLua,
        [key],
        [String(windowSeconds)],
      );
    } else {
      const r = tcpClient();
      await ensureTcpConnected(r);
      result = await r.eval(
        fixedWindowLua,
        1,
        key,
        String(windowSeconds),
      );
    }

    if (!Array.isArray(result) || result.length < 2) {
      throw new Error("Unexpected rate-limit response");
    }

    const count = Number(result[0]);
    const ttl = Number(result[1]);

    if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
      throw new Error("Invalid rate-limit response");
    }

    if (count > limit) {
      throw new RateLimitError(Math.max(1, ttl));
    }
  } catch (error) {
    if (error instanceof RateLimitError) throw error;

    // Fail closed: never silently disable security throttling.
    throw new ServiceUnavailableError();
  }
}
