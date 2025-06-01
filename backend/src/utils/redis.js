import Redis from "ioredis";
import {
  redisConnectionStatus,
  redisOperationDuration,
} from "../services/metrics.js";
import { recordCacheHit, recordCacheMiss } from "./cacheMetrics.js";

const INSTANCE_ID = process.env.INSTANCE_ID || "backend-unknown";

// Redis connection
const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
});

// Connection event handlers
redisClient.on("connect", () => {
  console.log(
    "✅ Connected to Redis at",
    redisClient.options.host + ":" + redisClient.options.port
  );
  redisConnectionStatus.labels({ instance: INSTANCE_ID }).set(1);
});

redisClient.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
  redisConnectionStatus.labels({ instance: INSTANCE_ID }).set(0);
});

redisClient.on("close", () => {
  console.log("🔌 Redis connection closed");
  redisConnectionStatus.labels({ instance: INSTANCE_ID }).set(0);
});

// Ping function
export async function redisPing() {
  try {
    const start = process.hrtime.bigint();
    const result = await redisClient.ping();
    const duration = Number(process.hrtime.bigint() - start) / 1e9;

    redisOperationDuration
      .labels({ operation: "ping", instance: INSTANCE_ID })
      .observe(duration);

    return result === "PONG";
  } catch (error) {
    return false;
  }
}

// Enhanced Redis operations with metrics
export async function redisGet(key) {
  try {
    const start = process.hrtime.bigint();
    const result = await redisClient.get(key);
    const duration = Number(process.hrtime.bigint() - start) / 1e9;

    redisOperationDuration
      .labels({ operation: "get", instance: INSTANCE_ID })
      .observe(duration);

    if (result !== null) {
      recordCacheHit("redis", "get");
    } else {
      recordCacheMiss("redis", "get");
    }

    return result;
  } catch (error) {
    recordCacheMiss("redis", "get");
    console.error("Redis GET error:", error);
    return null;
  }
}

export async function redisSet(key, value, ttl = 3600) {
  try {
    const start = process.hrtime.bigint();
    const result = await redisClient.setex(key, ttl, value);
    const duration = Number(process.hrtime.bigint() - start) / 1e9;

    redisOperationDuration
      .labels({ operation: "set", instance: INSTANCE_ID })
      .observe(duration);

    return result;
  } catch (error) {
    console.error("Redis SET error:", error);
    return null;
  }
}

export async function redisSetex(key, ttl, value) {
  return redisSet(key, value, ttl);
}

// ✅ ADD: Missing redisDel function
export async function redisDel(...keys) {
  try {
    const start = process.hrtime.bigint();
    const result = await redisClient.del(...keys);
    const duration = Number(process.hrtime.bigint() - start) / 1e9;

    redisOperationDuration
      .labels({ operation: "del", instance: INSTANCE_ID })
      .observe(duration);

    return result;
  } catch (error) {
    console.error("Redis DEL error:", error);
    return 0;
  }
}

// ✅ ADD: Missing redisKeys function
export async function redisKeys(pattern) {
  try {
    const start = process.hrtime.bigint();
    const result = await redisClient.keys(pattern);
    const duration = Number(process.hrtime.bigint() - start) / 1e9;

    redisOperationDuration
      .labels({ operation: "keys", instance: INSTANCE_ID })
      .observe(duration);

    return result;
  } catch (error) {
    console.error("Redis KEYS error:", error);
    return [];
  }
}

// ✅ ADD: Missing redisExists function (bonus utility)
export async function redisExists(key) {
  try {
    const start = process.hrtime.bigint();
    const result = await redisClient.exists(key);
    const duration = Number(process.hrtime.bigint() - start) / 1e9;

    redisOperationDuration
      .labels({ operation: "exists", instance: INSTANCE_ID })
      .observe(duration);

    return result === 1;
  } catch (error) {
    console.error("Redis EXISTS error:", error);
    return false;
  }
}

// ✅ ADD: Missing redisTtl function (bonus utility)
export async function redisTtl(key) {
  try {
    const start = process.hrtime.bigint();
    const result = await redisClient.ttl(key);
    const duration = Number(process.hrtime.bigint() - start) / 1e9;

    redisOperationDuration
      .labels({ operation: "ttl", instance: INSTANCE_ID })
      .observe(duration);

    return result;
  } catch (error) {
    console.error("Redis TTL error:", error);
    return -1;
  }
}

export { redisClient };
