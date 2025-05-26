import { httpRequestsTotal, httpRequestDuration } from "../services/metrics.js";

export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    // Record metrics
    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode,
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route: route,
      },
      duration
    );

    originalEnd.apply(this, args);
  };

  next();
};
