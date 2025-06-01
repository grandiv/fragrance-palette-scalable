import {
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestRate,
  memoryUsage,
  cpuUsage,
  eventLoopLag,
} from "../services/metrics.js";
import os from "os";

const INSTANCE_ID = process.env.INSTANCE_ID || "backend-unknown";

// Track request rate
let requestCount = 0;
let lastRequestTime = Date.now();
setInterval(() => {
  const now = Date.now();
  const timeDiff = (now - lastRequestTime) / 1000;
  const rate = requestCount / Math.max(timeDiff, 1);
  httpRequestRate.labels({ instance: INSTANCE_ID }).set(rate);
  requestCount = 0;
  lastRequestTime = now;
}, 10000); // Update every 10 seconds

// Update system metrics every 30 seconds
setInterval(() => {
  // Memory usage
  const memUsage = process.memoryUsage();
  memoryUsage.labels({ type: "rss", instance: INSTANCE_ID }).set(memUsage.rss);
  memoryUsage
    .labels({ type: "heapUsed", instance: INSTANCE_ID })
    .set(memUsage.heapUsed);
  memoryUsage
    .labels({ type: "heapTotal", instance: INSTANCE_ID })
    .set(memUsage.heapTotal);
  memoryUsage
    .labels({ type: "external", instance: INSTANCE_ID })
    .set(memUsage.external);

  // CPU usage (basic approximation)
  const cpus = os.cpus();
  const totalCpu = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((sum, time) => sum + time, 0);
    const idle = cpu.times.idle;
    return acc + (1 - idle / total) * 100;
  }, 0);
  cpuUsage.labels({ instance: INSTANCE_ID }).set(totalCpu / cpus.length);

  // Event loop lag
  const start = process.hrtime.bigint();
  setImmediate(() => {
    const lag = Number(process.hrtime.bigint() - start) / 1e9;
    eventLoopLag.labels({ instance: INSTANCE_ID }).set(lag);
  });
}, 30000);

export const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();
  requestCount++;

  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;

    // Record metrics
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
      instance: INSTANCE_ID,
    });

    httpRequestDuration
      .labels({
        method: req.method,
        route: req.route?.path || req.path,
        instance: INSTANCE_ID,
      })
      .observe(duration);

    originalEnd.apply(this, args);
  };

  next();
};
