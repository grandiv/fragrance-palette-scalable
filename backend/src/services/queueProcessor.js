import { connectRabbitMQ, publishToQueue } from "./rabbitmq.js";

class QueueProcessor {
  constructor() {
    this.isProcessing = false;
  }

  async start() {
    if (this.isProcessing) return;

    try {
      // RabbitMQ connection and consumers are handled in rabbitmq.js
      this.isProcessing = true;
      console.log("✅ Queue processor started");
    } catch (error) {
      console.error("❌ Failed to start queue processor:", error);
    }
  }

  async stop() {
    this.isProcessing = false;
    console.log("🔄 Queue processor stopped");
  }
}

export const queueProcessor = new QueueProcessor();
