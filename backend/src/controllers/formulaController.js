import { prisma } from "../utils/prisma.js";
import { redisClient } from "../utils/redis.js";
import { callLLM } from "../services/aiService.js";

export const generateFormula = async (req, res) => {
  try {
    const { description } = req.body;
    const userId = req.user.id;

    // Check Redis cache first
    const cacheKey = `formula:${userId}:${Buffer.from(description).toString(
      "base64"
    )}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const formulaResponse = await callLLM(description);

    const formula = await prisma.formula.create({
      data: {
        userId,
        fragranceFamilyId: formulaResponse.fragranceFamilyId,
        name: formulaResponse.name,
        description: formulaResponse.description,
        topNote: formulaResponse.topNote,
        middleNote: formulaResponse.middleNote,
        baseNote: formulaResponse.baseNote,
        mixing: formulaResponse.mixing,
      },
      include: {
        fragranceFamily: true,
      },
    });

    // Cache for 1 hour
    await redisClient.setex(cacheKey, 3600, JSON.stringify(formula));

    res.json(formula);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate formula" });
  }
};

export const getUserFormulas = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Try Redis cache first
    const cacheKey = `formulas:${userId}:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const formulas = await prisma.formula.findMany({
      where: { userId },
      include: { fragranceFamily: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.formula.count({ where: { userId } });

    const result = {
      formulas,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    // Cache for 5 minutes
    await redisClient.setex(cacheKey, 300, JSON.stringify(result));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch formulas" });
  }
};
