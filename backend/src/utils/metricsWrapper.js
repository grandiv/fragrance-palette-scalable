import {
  databaseQueryDuration,
  databaseQueryCount,
  databaseConnectionsActive,
} from "../services/metrics.js";

const INSTANCE_ID = process.env.INSTANCE_ID || "backend-unknown";

export function wrapPrismaWithMetrics(prismaClient, dbType = "unknown") {
  return new Proxy(prismaClient, {
    get(target, prop) {
      const value = target[prop];

      if (typeof value === "object" && value !== null) {
        // Wrap model operations
        return new Proxy(value, {
          get(modelTarget, modelProp) {
            const modelValue = modelTarget[modelProp];

            if (typeof modelValue === "function") {
              return async function (...args) {
                const start = process.hrtime.bigint();
                const operation = modelProp;
                const table = prop;

                try {
                  const result = await modelValue.apply(this, args);
                  const duration =
                    Number(process.hrtime.bigint() - start) / 1e9;

                  databaseQueryDuration
                    .labels({ operation, table, instance: INSTANCE_ID })
                    .observe(duration);

                  databaseQueryCount.inc({
                    operation,
                    database_type: dbType,
                    status: "success",
                    instance: INSTANCE_ID,
                  });

                  return result;
                } catch (error) {
                  const duration =
                    Number(process.hrtime.bigint() - start) / 1e9;

                  databaseQueryDuration
                    .labels({ operation, table, instance: INSTANCE_ID })
                    .observe(duration);

                  databaseQueryCount.inc({
                    operation,
                    database_type: dbType,
                    status: "error",
                    instance: INSTANCE_ID,
                  });

                  throw error;
                }
              };
            }

            return modelValue;
          },
        });
      }

      return value;
    },
  });
}
