import { PrismaClient } from "@prisma/client";

// Master database for writes
export const prismaMaster = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_MASTER || process.env.DATABASE_URL,
    },
  },
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

// Read replica for reads
export const prismaReplica = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_REPLICA || process.env.DATABASE_URL,
    },
  },
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

// Connection pool configuration
const connectionPoolConfig = {
  pool_max_conns: 20,
  pool_min_conns: 5,
  pool_timeout: 30,
  statement_timeout: 30000,
  query_timeout: 30000,
};

// Enhanced connection URLs with pooling
let masterUrl, replicaUrl;

try {
  masterUrl = new URL(
    process.env.DATABASE_URL_MASTER || process.env.DATABASE_URL
  );
  replicaUrl = new URL(
    process.env.DATABASE_URL_REPLICA || process.env.DATABASE_URL
  );

  Object.entries(connectionPoolConfig).forEach(([key, value]) => {
    masterUrl.searchParams.set(key, value.toString());
    replicaUrl.searchParams.set(key, value.toString());
  });
} catch (error) {
  console.warn("URL parsing failed, using basic connection");
}

// Pooled connections
export const prismaPooledMaster = masterUrl
  ? new PrismaClient({
      datasources: { db: { url: masterUrl.toString() } },
    })
  : prismaMaster;

export const prismaPooledReplica = replicaUrl
  ? new PrismaClient({
      datasources: { db: { url: replicaUrl.toString() } },
    })
  : prismaReplica;

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

// Default export for backward compatibility
export const prisma = prismaMaster;

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down database connections...");
  await prismaMaster.$disconnect();
  await prismaReplica.$disconnect();
  if (prismaPooledMaster !== prismaMaster)
    await prismaPooledMaster.$disconnect();
  if (prismaPooledReplica !== prismaReplica)
    await prismaPooledReplica.$disconnect();
});
