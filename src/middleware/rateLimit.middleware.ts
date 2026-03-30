import { Request, Response, NextFunction } from 'express';
import { redisClient, isRedisAvailable } from '../config/redis.js';

const TIER_RATE_LIMITS = {
  FREE:       { windowSeconds: 60, maxRequests: 2 },
  STARTER:    { windowSeconds: 60, maxRequests: 10 },
  PRO:        { windowSeconds: 60, maxRequests: 50 },
  SCALE:      { windowSeconds: 60, maxRequests: 200 },
  ENTERPRISE: { windowSeconds: 60, maxRequests: 500 },
};

// In-memory fallback: key -> { count, windowStart }
interface Window { count: number; windowStart: number }
const memWindows = new Map<string, Window>();

function memCheck(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memWindows.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    memWindows.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export const rateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const apiKeyHash = (req as any).apiKeyHash;
  const apiTier    = (req as any).apiTier || 'STARTER';
  const endpoint   = req.originalUrl.split('?')[0];

  const limitConfig = TIER_RATE_LIMITS[apiTier as keyof typeof TIER_RATE_LIMITS];
  const windowKey   = `rate_limit:${apiKeyHash}:${endpoint}:${Math.floor(Date.now() / (limitConfig.windowSeconds * 1000))}`;

  // Try Redis first
  if (isRedisAvailable() && redisClient) {
    try {
      const count = await redisClient.incr(windowKey);
      if (count === 1) {
        await redisClient.expire(windowKey, limitConfig.windowSeconds);
      }
      if (count > limitConfig.maxRequests) {
        res.status(429).json({
          success: false,
          error: {
            code: 'rate_limit_exceeded',
            message: `Rate limit exceeded. ${limitConfig.maxRequests} requests per ${limitConfig.windowSeconds}s allowed for ${apiTier} tier.`,
            docs_url: 'https://docs.trustiq.io/rate-limits',
          },
          meta: {
            request_id: req.headers['x-request-id'] || 'anonymous',
            version: '1.0.0',
            processing_ms: Date.now() - (req as any).startTime,
          },
        });
        return;
      }
      const remaining = limitConfig.maxRequests - count;
      res.set('X-RateLimit-Limit',     String(limitConfig.maxRequests));
      res.set('X-RateLimit-Remaining', String(remaining));
      next();
      return;
    } catch { /* fall through to memory */ }
  }

  // In-memory fallback
  const allowed = memCheck(windowKey, limitConfig.maxRequests, limitConfig.windowSeconds * 1000);
  if (!allowed) {
    res.status(429).json({
      success: false,
      error: {
        code: 'rate_limit_exceeded',
        message: `Rate limit exceeded. ${limitConfig.maxRequests} requests per ${limitConfig.windowSeconds}s allowed for ${apiTier} tier.`,
        docs_url: 'https://docs.trustiq.io/rate-limits',
      },
      meta: {
        request_id: req.headers['x-request-id'] || 'anonymous',
        version: '1.0.0',
        processing_ms: Date.now() - (req as any).startTime,
      },
    });
    return;
  }
  next();
};
