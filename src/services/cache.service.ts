import { redisClient, isRedisAvailable } from '../config/redis.js';

// In-memory fallback cache
interface MemEntry { value: string; expiresAt: number }
const memCache = new Map<string, MemEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memCache.entries()) {
    if (v.expiresAt < now) memCache.delete(k);
  }
}, 60_000);

async function rawGet(key: string): Promise<string | null> {
  if (isRedisAvailable() && redisClient) {
    try { return await redisClient.get(key); } catch { /* fall through */ }
  }
  const entry = memCache.get(key);
  if (!entry || entry.expiresAt < Date.now()) { memCache.delete(key); return null; }
  return entry.value;
}

async function rawSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (isRedisAvailable() && redisClient) {
    try { await redisClient.setex(key, ttlSeconds, value); return; } catch { /* fall through */ }
  }
  memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function rawDel(key: string): Promise<void> {
  if (isRedisAvailable() && redisClient) {
    try { await redisClient.del(key); } catch { /* ignore */ }
  }
  memCache.delete(key);
}

async function rawExists(key: string): Promise<boolean> {
  if (isRedisAvailable() && redisClient) {
    try { return (await redisClient.exists(key)) === 1; } catch { /* fall through */ }
  }
  const entry = memCache.get(key);
  return !!entry && entry.expiresAt >= Date.now();
}

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await rawGet(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlInSeconds = 3600): Promise<void> {
    try {
      await rawSet(key, JSON.stringify(value), ttlInSeconds);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await rawDel(key);
    } catch (error) {
      console.error('Cache del error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return await rawExists(key);
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async getIpReputation(ip: string): Promise<any | null> {
    return this.get(`trustiq:cache:ip:${ip}`);
  }

  async setIpReputation(ip: string, data: any, ttlInHours = 24): Promise<void> {
    await this.set(`trustiq:cache:ip:${ip}`, data, ttlInHours * 3600);
  }

  async getEmailReputation(domain: string): Promise<any | null> {
    return this.get(`trustiq:cache:email:${domain}`);
  }

  async setEmailReputation(domain: string, data: any, ttlInHours = 6): Promise<void> {
    await this.set(`trustiq:cache:email:${domain}`, data, ttlInHours * 3600);
  }

  async getDeviceFingerprint(deviceHash: string): Promise<any | null> {
    return this.get(`trustiq:cache:device:${deviceHash}`);
  }

  async setDeviceFingerprint(deviceHash: string, data: any, ttlInDays = 30): Promise<void> {
    await this.set(`trustiq:cache:device:${deviceHash}`, data, ttlInDays * 86400);
  }

  async getAssessmentCacheKey(params: any): Promise<string> {
    const normalizedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `trustiq:cache:assessment:${Buffer.from(normalizedParams).toString('base64')}`;
  }

  async getAssessmentCache(params: any): Promise<any | null> {
    return this.get(await this.getAssessmentCacheKey(params));
  }

  async setAssessmentCache(params: any, data: any, ttlInMinutes = 10): Promise<void> {
    await this.set(await this.getAssessmentCacheKey(params), data, ttlInMinutes * 60);
  }
}
