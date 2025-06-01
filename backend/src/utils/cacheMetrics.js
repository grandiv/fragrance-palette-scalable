import { cacheHits, cacheMisses, cacheHitRatio } from "../services/metrics.js";

const INSTANCE_ID = process.env.INSTANCE_ID || "backend-unknown";
let totalHits = 0;
let totalMisses = 0;

export function recordCacheHit(cacheType, operation = "get") {
  totalHits++;
  cacheHits.inc({ cache_type: cacheType, operation, instance: INSTANCE_ID });
  updateHitRatio(cacheType);
}

export function recordCacheMiss(cacheType, operation = "get") {
  totalMisses++;
  cacheMisses.inc({ cache_type: cacheType, operation, instance: INSTANCE_ID });
  updateHitRatio(cacheType);
}

function updateHitRatio(cacheType) {
  const total = totalHits + totalMisses;
  if (total > 0) {
    const ratio = totalHits / total;
    cacheHitRatio
      .labels({ cache_type: cacheType, instance: INSTANCE_ID })
      .set(ratio);
  }
}
