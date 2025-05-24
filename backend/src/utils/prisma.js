import { PrismaClient } from "@prisma/client";

// Master database for writes
export const prismaMaster = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_MASTER,
    },
  },
});

// Read replica for reads
export const prismaReplica = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_REPLICA,
    },
  },
});

// Smart connection routing
export const prisma = {
  // Write operations
  user: prismaMaster.user,
  formula: prismaMaster.formula,
  fragranceFamily: prismaMaster.fragranceFamily,

  // Read operations
  findMany: (model, ...args) => prismaReplica[model].findMany(...args),
  findUnique: (model, ...args) => prismaReplica[model].findUnique(...args),
  findFirst: (model, ...args) => prismaReplica[model].findFirst(...args),
  count: (model, ...args) => prismaReplica[model].count(...args),
};
