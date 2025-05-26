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
import { connectRabbitMQ, closeRabbitMQ } from "./services/rabbitmq.js";
import { prismaMaster } from "./utils/prisma.js";
import { redisClient, redisPing } from "./utils/redis.js";
import { queueProcessor } from "./services/queueProcessor.js";

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

    // Connect to database (required)
    await prismaMaster.$connect();
    console.log("✅ Connected to database");

    // Try to connect to Redis (optional)
    const redisConnected = await redisPing();
    if (redisConnected) {
      console.log("✅ Connected to Redis");
    } else {
      console.warn("⚠️  Redis not available - running without caching");
    }

    // Connect to RabbitMQ and start queue processor (optional)
    try {
      await connectRabbitMQ();
      await queueProcessor.start();
      console.log("✅ Connected to RabbitMQ and started queue processor");
    } catch (error) {
      console.warn(
        "⚠️  RabbitMQ connection failed (continuing without it):",
        error.message
      );
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔗 API endpoints:`);
      console.log(`   • POST /api/auth/register`);
      console.log(`   • POST /api/auth/login`);
      console.log(`   • POST /api/formulas/generate`);
      console.log(`   • GET  /api/formulas`);
      console.log(`   • GET  /api/formulas/status/:taskId`);
      console.log(`   • GET  /api/health`);
      console.log(`   • GET  /api/metrics`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
async function gracefulShutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);

  try {
    // Stop queue processor
    if (queueProcessor) {
      await queueProcessor.stop();
      console.log("✅ Queue processor stopped");
    }

    // Close RabbitMQ connection
    try {
      await closeRabbitMQ();
      console.log("✅ RabbitMQ connection closed");
    } catch (error) {
      console.warn("⚠️  Error closing RabbitMQ:", error.message);
    }

    // Disconnect from database
    await prismaMaster.$disconnect();
    console.log("✅ Database connection closed");

    // Close Redis connection
    try {
      await redisClient.quit();
      console.log("✅ Redis connection closed");
    } catch (error) {
      console.warn("⚠️  Error closing Redis:", error.message);
    }

    console.log("✅ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

// Handle different termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

// Start the server
startServer();
