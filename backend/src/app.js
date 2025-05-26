import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authMiddleware } from "./middlewares/auth.js";
import authRoutes from "./routes/auth.js";
import formulaRoutes from "./routes/formulas.js";
import healthRoutes from "./routes/health.js";
import metricsRoutes from "./routes/metrics.js";
import { connectRabbitMQ } from "./services/rabbitmq.js";
import { prismaMaster } from "./utils/prisma.js";
import { redisClient } from "./utils/redis.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later" },
});
app.use(limiter);

app.use(express.json({ limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/formulas", authMiddleware, formulaRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/metrics", metricsRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize services
async function startServer() {
  try {
    console.log("Starting server initialization...");

    // Connect to database
    await prismaMaster.$connect();
    console.log("✅ Connected to database");

    // Connect to Redis
    await redisClient.ping();
    console.log("✅ Connected to Redis");

    // Connect to RabbitMQ (optional, don't fail if not available)
    try {
      await connectRabbitMQ();
      console.log("✅ Connected to RabbitMQ");
    } catch (error) {
      console.warn(
        "⚠️  RabbitMQ connection failed (continuing without it):",
        error.message
      );
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await prismaMaster.$disconnect();
  await redisClient.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await prismaMaster.$disconnect();
  await redisClient.quit();
  process.exit(0);
});

startServer();
