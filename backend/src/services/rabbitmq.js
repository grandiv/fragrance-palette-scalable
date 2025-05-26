import amqp from "amqplib";
import { callLLM } from "./aiService.js";
import { prismaMaster as prisma } from "../utils/prisma.js";
import {
  redisClient,
  redisSetex,
  redisDel,
  redisKeys,
} from "../utils/redis.js";

let connection;
let channel;

export async function connectRabbitMQ() {
  try {
    const rabbitmqURL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
    connection = await amqp.connect(rabbitmqURL);
    channel = await connection.createChannel();

    // Declare queues
    await channel.assertQueue("formula.generate", { durable: true });
    await channel.assertQueue("domain.knowledge", { durable: true });
    await channel.assertQueue("database.query", { durable: true });

    // Start consumers
    await startFormulaGenerationConsumer();
    await startDomainKnowledgeConsumer();
    await startDatabaseQueryConsumer();

    console.log("✅ Connected to RabbitMQ");
  } catch (error) {
    console.error("❌ Failed to connect to RabbitMQ:", error);
    throw error;
  }
}

export async function publishToQueue(queueName, data) {
  try {
    if (!channel) {
      throw new Error("RabbitMQ channel not available");
    }

    const message = Buffer.from(JSON.stringify(data));
    await channel.sendToQueue(queueName, message, { persistent: true });
    console.log(`📤 Published to queue ${queueName}:`, data);
  } catch (error) {
    console.error("❌ Failed to publish to queue:", error);
    throw error;
  }
}

async function startFormulaGenerationConsumer() {
  await channel.consume(
    "formula.generate",
    async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          const { taskId, userId, description } = data;

          console.log(`🔄 Processing formula generation: ${taskId}`);

          // Update task status
          await redisSetex(
            `task:${taskId}`,
            3600,
            JSON.stringify({
              status: "processing",
              progress: 25,
              message: "Analyzing fragrance description...",
            })
          );

          // Generate formula using AI service
          const formulaResponse = await callLLM(description);

          // Update progress
          await redisSetex(
            `task:${taskId}`,
            3600,
            JSON.stringify({
              status: "processing",
              progress: 75,
              message: "Saving formula to database...",
            })
          );

          // Save to database
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

          // Cache result and complete task
          const cacheKey = `formula:${userId}:${Buffer.from(
            description
          ).toString("base64")}`;
          await redisSetex(cacheKey, 3600, JSON.stringify(formula));

          await redisSetex(
            `task:${taskId}`,
            3600,
            JSON.stringify({
              status: "completed",
              progress: 100,
              message: "Formula generated successfully!",
              result: formula,
            })
          );

          // Clear user formulas cache
          const keys = await redisKeys(`formulas:${userId}:*`);
          if (keys.length > 0) {
            await redisDel(...keys);
          }

          console.log(`✅ Formula generation completed: ${taskId}`);
          channel.ack(msg);
        } catch (error) {
          console.error("❌ Formula generation error:", error);

          const data = JSON.parse(msg.content.toString());
          await redisSetex(
            `task:${data.taskId}`,
            3600,
            JSON.stringify({
              status: "failed",
              error: error.message,
            })
          );

          channel.nack(msg, false, false);
        }
      }
    },
    { noAck: false }
  );
}

async function startDomainKnowledgeConsumer() {
  await channel.consume(
    "domain.knowledge",
    async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          console.log("🔄 Processing domain knowledge request:", data);

          // Process domain knowledge request here
          // This could involve fetching fragrance data, trends, etc.

          channel.ack(msg);
        } catch (error) {
          console.error("❌ Domain knowledge processing error:", error);
          channel.nack(msg, false, false);
        }
      }
    },
    { noAck: false }
  );
}

async function startDatabaseQueryConsumer() {
  await channel.consume(
    "database.query",
    async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          console.log("🔄 Processing database query:", data);

          // Process database queries here
          // This could involve complex queries, data aggregation, etc.

          channel.ack(msg);
        } catch (error) {
          console.error("❌ Database query processing error:", error);
          channel.nack(msg, false, false);
        }
      }
    },
    { noAck: false }
  );
}

export async function closeRabbitMQ() {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    console.log("🔄 RabbitMQ connection closed");
  } catch (error) {
    console.error("❌ Error closing RabbitMQ connection:", error);
  }
}
