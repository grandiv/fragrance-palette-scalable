import Redis from "ioredis";

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true, // Don't connect immediately
  enableOfflineQueue: false, // Don't queue commands when offline
};

export const redisClient = new Redis(redisConfig);

let isRedisAvailable = false;

redisClient.on("connect", () => {
  console.log("✅ Connected to Redis");
  isRedisAvailable = true;
});

redisClient.on("error", (err) => {
  console.warn("⚠️  Redis connection failed:", err.message);
  isRedisAvailable = false;
});

redisClient.on("close", () => {
  console.warn("⚠️  Redis connection closed");
  isRedisAvailable = false;
});

// Wrapper functions to handle Redis unavailability
export const redisGet = async (key) => {
  if (!isRedisAvailable) return null;
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.warn("Redis GET failed:", error.message);
    return null;
  }
};

export const redisSet = async (key, value, ttl) => {
  if (!isRedisAvailable) return false;
  try {
    if (ttl) {
      return await redisClient.setex(key, ttl, value);
    }
    return await redisClient.set(key, value);
  } catch (error) {
    console.warn("Redis SET failed:", error.message);
    return false;
  }
};

export const redisSetex = async (key, ttl, value) => {
  if (!isRedisAvailable) return false;
  try {
    return await redisClient.setex(key, ttl, value);
  } catch (error) {
    console.warn("Redis SETEX failed:", error.message);
    return false;
  }
};

export const redisDel = async (...keys) => {
  if (!isRedisAvailable) return false;
  try {
    return await redisClient.del(...keys);
  } catch (error) {
    console.warn("Redis DEL failed:", error.message);
    return false;
  }
};

export const redisKeys = async (pattern) => {
  if (!isRedisAvailable) return [];
  try {
    return await redisClient.keys(pattern);
  } catch (error) {
    console.warn("Redis KEYS failed:", error.message);
    return [];
  }
};

export const redisPing = async () => {
  if (!isRedisAvailable) {
    try {
      await redisClient.ping();
      isRedisAvailable = true;
      return true;
    } catch (error) {
      return false;
    }
  }
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    isRedisAvailable = false;
    return false;
  }
};

// Check if Redis is available
export const isRedisConnected = () => isRedisAvailable;
