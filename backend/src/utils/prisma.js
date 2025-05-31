import { PrismaClient } from "@prisma/client";

// Connection configuration
const connectionConfig = {
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
  errorFormat: "pretty",
};

// Validate database URLs
const masterUrl = process.env.DATABASE_URL_MASTER || process.env.DATABASE_URL;
const replicaUrl =
  process.env.DATABASE_URL_REPLICA ||
  process.env.DATABASE_URL_MASTER ||
  process.env.DATABASE_URL;

console.log(`📊 Database URLs:
  Master: ${masterUrl?.replace(/:[^:@]*@/, ":****@")}
  Replica: ${replicaUrl?.replace(/:[^:@]*@/, ":****@")}`);

// Master database for writes
export const prismaMaster = new PrismaClient({
  ...connectionConfig,
  datasources: {
    db: { url: masterUrl },
  },
});

// Read replica for reads
export const prismaReplica = new PrismaClient({
  ...connectionConfig,
  datasources: {
    db: { url: replicaUrl },
  },
});

// Test connections on startup with better error handling
prismaMaster
  .$connect()
  .then(() => console.log("✅ Master database connected"))
  .catch((err) =>
    console.error("❌ Master database connection failed:", err.message)
  );

prismaReplica
  .$connect()
  .then(() => console.log("✅ Replica database connected"))
  .catch((err) => {
    console.warn(
      "⚠️ Replica database connection failed, will use master:",
      err.message
    );
  });

// Enhanced connection URLs with pooling
export const prismaPooledMaster = new PrismaClient({
  ...connectionConfig,
  datasources: { db: { url: masterUrl } },
});

export const prismaPooledReplica = new PrismaClient({
  ...connectionConfig,
  datasources: { db: { url: replicaUrl } },
});

// Smart routing with fallback
export class DatabaseRouter {
  static async executeRead(operation) {
    try {
      return await operation(prismaPooledReplica);
    } catch (error) {
      console.warn("Replica failed, falling back to master:", error.message);
      return await operation(prismaPooledMaster);
    }
  }

  static async executeWrite(operation) {
    return await operation(prismaPooledMaster);
  }
}

// Default exports
export const prisma = prismaMaster;

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down database connections...");
  await Promise.all([
    prismaMaster.$disconnect(),
    prismaReplica.$disconnect(),
    prismaPooledMaster.$disconnect(),
    prismaPooledReplica.$disconnect(),
  ]);
});
