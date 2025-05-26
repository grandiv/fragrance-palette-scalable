import promClient from "prom-client";

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new promClient.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route"],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const formulaGenerationsTotal = new promClient.Counter({
  name: "formula_generations_total",
  help: "Total number of formula generations",
  labelNames: ["status"],
});

const activeUsers = new promClient.Gauge({
  name: "active_users_total",
  help: "Number of active users",
});

const databaseConnectionsActive = new promClient.Gauge({
  name: "database_connections_active",
  help: "Number of active database connections",
});

const redisConnectionStatus = new promClient.Gauge({
  name: "redis_connection_status",
  help: "Redis connection status (1 = connected, 0 = disconnected)",
});

// Register metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(formulaGenerationsTotal);
register.registerMetric(activeUsers);
register.registerMetric(databaseConnectionsActive);
register.registerMetric(redisConnectionStatus);

export {
  register,
  httpRequestsTotal,
  httpRequestDuration,
  formulaGenerationsTotal,
  activeUsers,
  databaseConnectionsActive,
  redisConnectionStatus,
};
