import promClient from "prom-client";

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (includes CPU, memory, Node.js metrics)
promClient.collectDefaultMetrics({
  register,
  prefix: "nodejs_",
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// ✅ THROUGHPUT METRICS
const httpRequestsTotal = new promClient.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code", "instance"],
});

const httpRequestRate = new promClient.Gauge({
  name: "http_requests_per_second",
  help: "HTTP requests per second",
  labelNames: ["instance"],
});

// ✅ LATENCY METRICS
const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "instance"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const databaseQueryDuration = new promClient.Histogram({
  name: "database_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation", "table", "instance"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

// ✅ RESOURCE UTILIZATION METRICS
const memoryUsage = new promClient.Gauge({
  name: "memory_usage_bytes",
  help: "Memory usage in bytes",
  labelNames: ["type", "instance"],
});

const cpuUsage = new promClient.Gauge({
  name: "cpu_usage_percent",
  help: "CPU usage percentage",
  labelNames: ["instance"],
});

const eventLoopLag = new promClient.Gauge({
  name: "nodejs_eventloop_lag_seconds",
  help: "Event loop lag in seconds",
  labelNames: ["instance"],
});

// ✅ CACHING EFFECTIVENESS METRICS
const cacheHits = new promClient.Counter({
  name: "cache_hits_total",
  help: "Total number of cache hits",
  labelNames: ["cache_type", "operation", "instance"],
});

const cacheMisses = new promClient.Counter({
  name: "cache_misses_total",
  help: "Total number of cache misses",
  labelNames: ["cache_type", "operation", "instance"],
});

const cacheHitRatio = new promClient.Gauge({
  name: "cache_hit_ratio",
  help: "Cache hit ratio (0-1)",
  labelNames: ["cache_type", "instance"],
});

// ✅ DATABASE REPLICATION METRICS
const databaseConnectionsActive = new promClient.Gauge({
  name: "database_connections_active",
  help: "Number of active database connections",
  labelNames: ["database_type", "instance"],
});

const databaseReplicationLag = new promClient.Gauge({
  name: "database_replication_lag_seconds",
  help: "Database replication lag in seconds",
  labelNames: ["replica_name", "instance"],
});

const databaseQueryCount = new promClient.Counter({
  name: "database_queries_total",
  help: "Total number of database queries",
  labelNames: ["operation", "database_type", "status", "instance"],
});

// ✅ BUSINESS METRICS
const formulaGenerationsTotal = new promClient.Counter({
  name: "formula_generations_total",
  help: "Total number of formula generations",
  labelNames: ["status", "instance"],
});

const activeUsers = new promClient.Gauge({
  name: "active_users_total",
  help: "Number of active users",
  labelNames: ["instance"],
});

const queueSize = new promClient.Gauge({
  name: "queue_size_total",
  help: "Number of items in queue",
  labelNames: ["queue_name", "instance"],
});

const queueProcessingTime = new promClient.Histogram({
  name: "queue_processing_duration_seconds",
  help: "Time spent processing queue items",
  labelNames: ["queue_name", "status", "instance"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});

// ✅ REDIS METRICS
const redisConnectionStatus = new promClient.Gauge({
  name: "redis_connection_status",
  help: "Redis connection status (1 = connected, 0 = disconnected)",
  labelNames: ["instance"],
});

const redisOperationDuration = new promClient.Histogram({
  name: "redis_operation_duration_seconds",
  help: "Duration of Redis operations",
  labelNames: ["operation", "instance"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});

// Register all metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestRate);
register.registerMetric(httpRequestDuration);
register.registerMetric(databaseQueryDuration);
register.registerMetric(memoryUsage);
register.registerMetric(cpuUsage);
register.registerMetric(eventLoopLag);
register.registerMetric(cacheHits);
register.registerMetric(cacheMisses);
register.registerMetric(cacheHitRatio);
register.registerMetric(databaseConnectionsActive);
register.registerMetric(databaseReplicationLag);
register.registerMetric(databaseQueryCount);
register.registerMetric(formulaGenerationsTotal);
register.registerMetric(activeUsers);
register.registerMetric(queueSize);
register.registerMetric(queueProcessingTime);
register.registerMetric(redisConnectionStatus);
register.registerMetric(redisOperationDuration);

export {
  register,
  httpRequestsTotal,
  httpRequestRate,
  httpRequestDuration,
  databaseQueryDuration,
  memoryUsage,
  cpuUsage,
  eventLoopLag,
  cacheHits,
  cacheMisses,
  cacheHitRatio,
  databaseConnectionsActive,
  databaseReplicationLag,
  databaseQueryCount,
  formulaGenerationsTotal,
  activeUsers,
  queueSize,
  queueProcessingTime,
  redisConnectionStatus,
  redisOperationDuration,
};
