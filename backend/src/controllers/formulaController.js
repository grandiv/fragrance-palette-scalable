import { DatabaseRouter } from "../utils/prisma.js";
import {
  redisClient,
  redisGet,
  redisSetex,
  redisDel,
  redisKeys,
} from "../utils/redis.js";
import { publishToQueue } from "../services/rabbitmq.js";
import { callLLM } from "../services/aiService.js";

export const getUserFormulas = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Try Redis cache first
    const cacheKey = `formulas:${userId}:${page}:${limit}`;
    const cached = await redisGet(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Use read replica with fallback
    const [formulas, total] = await Promise.all([
      DatabaseRouter.executeRead((prisma) =>
        prisma.formula.findMany({
          where: { userId },
          include: { fragranceFamily: true },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        })
      ),
      DatabaseRouter.executeRead((prisma) =>
        prisma.formula.count({ where: { userId } })
      ),
    ]);

    const transformedFormulas = formulas.map((formula) => ({
      ...formula,
      id: formula.id.toString(), // Convert to string
    }));

    const result = {
      formulas: transformedFormulas,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    // Cache for 5 minutes
    await redisSetex(cacheKey, 300, JSON.stringify(result));

    res.json(result);
  } catch (error) {
    console.error("Get formulas error:", error);
    res.status(500).json({ error: "Failed to fetch formulas" });
  }
};

export const generateFormula = async (req, res) => {
  try {
    const { description } = req.body;
    const userId = req.user.id;

    if (!description || description.trim().length < 10) {
      return res.status(400).json({
        error: "Description must be at least 10 characters long",
      });
    }

    // Create a task ID for tracking
    const taskId = `task_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Store initial task status in Redis
    await redisSetex(
      `task:${taskId}`,
      600,
      JSON.stringify({
        status: "queued",
        progress: 0,
        message: "Request queued for processing...",
      })
    );

    // Publish to RabbitMQ queue for background processing
    await publishToQueue("formula.generate", {
      taskId,
      description: description.trim(),
      userId,
      timestamp: new Date().toISOString(),
    });

    console.log(`Formula generation queued: ${taskId} for user: ${userId}`);

    res.json({
      taskId,
      status: "queued",
      message:
        "Your formula generation request has been queued. Please check status using the taskId.",
    });
  } catch (error) {
    console.error("Generate formula error:", error);
    res.status(500).json({ error: "Failed to queue formula generation" });
  }
};

export const getGenerationStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const status = await redisGet(`task:${taskId}`);

    if (!status) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(JSON.parse(status));
  } catch (error) {
    console.error("Get status error:", error);
    res.status(500).json({ error: "Failed to get status" });
  }
};

async function processFormulaGeneration(taskId, description, userId) {
  try {
    // Update progress
    await redisSetex(
      `task:${taskId}`,
      600,
      JSON.stringify({
        status: "processing",
        progress: 25,
        message: "Analyzing fragrance description...",
      })
    );

    // Call AI service
    const formulaData = await callLLM(description);

    await redisSetex(
      `task:${taskId}`,
      600,
      JSON.stringify({
        status: "processing",
        progress: 75,
        message: "Saving formula...",
      })
    );

    // Save to database
    const formula = await DatabaseRouter.executeWrite((prisma) =>
      prisma.formula.create({
        data: {
          ...formulaData,
          userId,
        },
        include: { fragranceFamily: true },
      })
    );

    // Clear user's formulas cache
    const cachePattern = `formulas:${userId}:*`;
    const keys = await redisKeys(cachePattern);
    if (keys.length > 0) {
      await redisDel(...keys);
    }

    // Update final status
    await redisSetex(
      `task:${taskId}`,
      300,
      JSON.stringify({
        status: "completed",
        progress: 100,
        message: "Formula generated successfully!",
        result: formula,
      })
    );
  } catch (error) {
    console.error("Formula generation error:", error);
    await redisSetex(
      `task:${taskId}`,
      300,
      JSON.stringify({
        status: "failed",
        progress: 0,
        message: error.message || "Failed to generate formula",
      })
    );
  }
}
