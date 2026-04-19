type RateLimitBucket = {
  count: number;
  resetAtMs: number;
};

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 20;
const DEFAULT_MAX_BYTES = 250_000;

declare global {
  var __marginmindRateLimitStore: Map<string, RateLimitBucket> | undefined;
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return fallback;
}

function getRateLimitStore(): Map<string, RateLimitBucket> {
  if (!globalThis.__marginmindRateLimitStore) {
    globalThis.__marginmindRateLimitStore = new Map();
  }
  return globalThis.__marginmindRateLimitStore;
}

export function readClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }
  return "unknown";
}

export function enforcePayloadSize(request: Request, maxBytes = DEFAULT_MAX_BYTES): Response | null {
  const rawLength = request.headers.get("content-length");
  if (!rawLength) return null;
  const bytes = Number(rawLength);
  if (Number.isFinite(bytes) && bytes > maxBytes) {
    return Response.json(
      { error: "payload_too_large", message: "Payload exceeds the allowed size." },
      { status: 413 }
    );
  }
  return null;
}

export function enforceRateLimit(request: Request, scope: string): Response | null {
  const store = getRateLimitStore();
  const windowMs = toPositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
  const maxRequests = toPositiveInt(process.env.API_RATE_LIMIT_MAX, DEFAULT_MAX_REQUESTS);
  const key = scope + ":" + readClientIp(request);
  const nowMs = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAtMs <= nowMs) {
    store.set(key, { count: 1, resetAtMs: nowMs + windowMs });
    return null;
  }

  if (bucket.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAtMs - nowMs) / 1000));
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message: "Too many requests. Please retry shortly."
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSeconds)
        }
      }
    );
  }

  bucket.count += 1;
  store.set(key, bucket);
  return null;
}
