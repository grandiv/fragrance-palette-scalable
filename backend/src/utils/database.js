import { PrismaClient } from "@prisma/client";

// Master database for writes
export const prismaMaster = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_MASTER,
    },
  },
  log: ["query", "info", "warn", "error"],
});

// Replica databases for reads
const replicaUrls = process.env.DATABASE_URL_REPLICA?.split(",") || [
  process.env.DATABASE_URL_MASTER,
];
let currentReplicaIndex = 0;

export const prismaReplicas = replicaUrls.map(
  (url) =>
    new PrismaClient({
      datasources: {
        db: { url: url.trim() },
      },
      log: ["warn", "error"],
    })
);

// Load balancer for read operations
export function getPrismaReadClient() {
  const replica = prismaReplicas[currentReplicaIndex];
  currentReplicaIndex = (currentReplicaIndex + 1) % prismaReplicas.length;
  return replica;
}

// Always use master for writes
export function getPrismaWriteClient() {
  return prismaMaster;
}

// Utility functions
export async function executeRead(query) {
  const client = getPrismaReadClient();
  return await query(client);
}

export async function executeWrite(query) {
  const client = getPrismaWriteClient();
  return await query(client);
}
