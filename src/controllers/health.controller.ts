import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { redisClient, isRedisAvailable } from '../config/redis.js';

export class HealthController {
  static async health(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const dbHealth    = await HealthController.checkDatabase();
      const redisStatus = await HealthController.checkRedis();

      // Only the database is critical — Redis is optional
      const isHealthy = dbHealth;

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: {
          status:    isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime:    process.uptime(),
          checks: {
            database: dbHealth    ? 'online' : 'offline',
            cache:    redisStatus ? 'redis'  : 'memory',
          },
          version: '1.0.0',
        },
        meta: {
          request_id:    req.headers['x-request-id'] || 'anonymous',
          version:       '1.0.0',
          processing_ms: Date.now() - startTime,
          from_cache:    false,
        },
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: {
          code:     'service_unavailable',
          message:  'Service health check failed',
          docs_url: 'https://docs.trustiq.io/health',
        },
        meta: {
          request_id:    req.headers['x-request-id'] || 'anonymous',
          version:       '1.0.0',
          processing_ms: Date.now() - startTime,
          from_cache:    false,
        },
      });
    }
  }

  private static async checkDatabase(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  private static async checkRedis(): Promise<boolean> {
    if (!isRedisAvailable() || !redisClient) return false;
    try {
      return (await redisClient.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
