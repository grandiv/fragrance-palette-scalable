import express from "express";
import { redisClient } from "../utils/redis.js";
import { prismaMaster } from "../utils/prisma.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Check database connection
    await prismaMaster.$queryRaw`SELECT 1`;

    // Check Redis connection
    await redisClient.ping();

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        redis: "connected",
      },
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
