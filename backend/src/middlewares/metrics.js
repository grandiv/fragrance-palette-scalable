import { httpRequestsTotal, httpRequestDuration } from "../services/metrics.js";

export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = (Date.now() - start) / 1000;

    // Record metrics
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });

    httpRequestDuration
      .labels({
        method: req.method,
        route: req.route?.path || req.path,
      })
      .observe(duration);

    originalEnd.apply(this, args);
  };

  next();
};
