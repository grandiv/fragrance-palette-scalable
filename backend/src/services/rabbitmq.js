import amqp from "amqplib";
import { callLLM } from "./aiService.js";
import { prisma } from "../utils/prisma.js";
import { redisClient } from "../utils/redis.js";

let connection;
let channel;

export async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://localhost"
    );
    channel = await connection.createChannel();

    await channel.assertQueue("formula_generation", { durable: true });
    await channel.assertQueue("domain_knowledge", { durable: true });
    await channel.assertQueue("database_queries", { durable: true });

    console.log("Connected to RabbitMQ");

    // Start consumers
    startFormulaGenerationConsumer();
    startDomainKnowledgeConsumer();
    startDatabaseQueryConsumer();
  } catch (error) {
    console.error("RabbitMQ connection error:", error);
  }
}

export async function publishToQueue(queueName, data) {
  if (!channel) {
    throw new Error("RabbitMQ not connected");
  }

  await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
    persistent: true,
  });
}

async function startFormulaGenerationConsumer() {
  await channel.consume(
    "formula_generation",
    async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          const { taskId, userId, description } = data;

          // Update task status
          await redisClient.setex(
            `task:${taskId}`,
            3600,
            JSON.stringify({
              status: "processing",
              progress: 0,
            })
          );

          // Generate formula
          const formulaResponse = await callLLM(description);

          // Update progress
          await redisClient.setex(
            `task:${taskId}`,
            3600,
            JSON.stringify({
              status: "processing",
              progress: 50,
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
          await redisClient.setex(cacheKey, 3600, JSON.stringify(formula));

          await redisClient.setex(
            `task:${taskId}`,
            3600,
            JSON.stringify({
              status: "completed",
              progress: 100,
              result: formula,
            })
          );

          // Clear user formulas cache
          const keys = await redisClient.keys(`formulas:${userId}:*`);
          if (keys.length > 0) {
            await redisClient.del(keys);
          }

          channel.ack(msg);
        } catch (error) {
          console.error("Formula generation error:", error);

          const data = JSON.parse(msg.content.toString());
          await redisClient.setex(
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
    "domain_knowledge",
    async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          // Process domain knowledge fetching
          console.log("Processing domain knowledge:", data);

          channel.ack(msg);
        } catch (error) {
          console.error("Domain knowledge error:", error);
          channel.nack(msg, false, false);
        }
      }
    },
    { noAck: false }
  );
}

async function startDatabaseQueryConsumer() {
  await channel.consume(
    "database_queries",
    async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          // Process database queries
          console.log("Processing database query:", data);

          channel.ack(msg);
        } catch (error) {
          console.error("Database query error:", error);
          channel.nack(msg, false, false);
        }
      }
    },
    { noAck: false }
  );
}

export async function closeRabbitMQ() {
  if (channel) await channel.close();
  if (connection) await connection.close();
}
