import express from "express";
import {
  register,
  redisConnectionStatus,
  databaseConnectionsActive,
} from "../services/metrics.js";
import { prismaMaster } from "../utils/prisma.js";
import { redisPing } from "../utils/redis.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Update real-time metrics
    const redisStatus = await redisPing();
    redisConnectionStatus.set(redisStatus ? 1 : 0);

    // You can add more real-time metrics here
    // databaseConnectionsActive.set(await getActiveConnections());

    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error("Metrics error:", error);
    res.status(500).send("Error generating metrics");
  }
});

export default router;
