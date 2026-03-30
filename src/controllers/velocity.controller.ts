import { Request, Response } from 'express';
import redis from '../config/redis.js';
import { VelocityCheckResponse } from '../types/user.types.js';
import { hashEmail, hashIp } from '../utils/hashUtils.js';
import { extractDomain } from '../utils/emailUtils.js';

export class VelocityController {
  static async checkVelocity(req: Request, res: Response): Promise<void> {
    const { entity_type, entity_value, windows = '1h,24h' } = req.query;
    const startTime = Date.now();

    try {
      const entityType = entity_type as 'ip' | 'email_domain' | 'device';
      const windowsArray = windows.toString().split(',');
      
      const entityHash = this.getEntityHash(entityType, entity_value as string);
      
      const velocityData: any = {};
      
      for (const window of windowsArray) {
        const redisKey = `trustiq:vel:${entityType}:${entityHash}:${window}`;
        const count = await redis.get(redisKey);
        
        const threshold = this.getVelocityThreshold(entityType, window);
        const isAnomalous = parseInt(count || '0') > threshold;
        
        velocityData[window] = {
          count: parseInt(count || '0'),
          threshold,
          is_anomalous: isAnomalous
        };
      }

      const isAnomalous = Object.values(velocityData).some((v: any) => v.is_anomalous);
      const anomalyScore = isAnomalous ? 75 : 0;
      
      const response: VelocityCheckResponse = {
        entity_type: entityType,
        entity: entity_value as string,
        velocity: velocityData,
        is_anomalous: isAnomalous,
        anomaly_score: anomalyScore,
        recommendation: isAnomalous 
          ? 'Unusual activity detected. Consider adding friction or blocking.'
          : 'Normal activity. No velocity concerns.'
      };

      res.json({
        success: true,
        data: response,
        meta: {
          request_id: req.headers['x-request-id'] || 'anonymous',
          version: '1.0.0',
          processing_ms: Date.now() - startTime,
          from_cache: false
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'internal_error',
          message: 'Velocity check failed',
          docs_url: 'https://docs.trustiq.io/errors'
        },
        meta: {
          request_id: req.headers['x-request-id'] || 'anonymous',
          version: '1.0.0',
          processing_ms: Date.now() - startTime,
          from_cache: false
        }
      });
    }
  }

  private static getEntityHash(entityType: string, entityValue: string): string {
    switch (entityType) {
      case 'ip':
        return hashIp(entityValue);
      case 'email_domain':
        return hashEmail(entityValue);
      case 'device':
        return entityValue;
      default:
        return entityValue;
    }
  }

  private static getVelocityThreshold(entityType: string, window: string): number {
    const thresholds: any = {
      ip: {
        '1m': 5,
        '5m': 10,
        '1h': parseInt(process.env.VELOCITY_THRESHOLD_IP_1H || '30'),
        '24h': parseInt(process.env.VELOCITY_THRESHOLD_IP_24H || '100'),
        '7d': 500
      },
      email_domain: {
        '1h': 15,
        '24h': parseInt(process.env.VELOCITY_THRESHOLD_DOMAIN_24H || '50'),
        '7d': 200
      },
      device: {
        '1h': parseInt(process.env.VELOCITY_THRESHOLD_DEVICE_1H || '10'),
        '24h': 20,
        '7d': 50
      }
    };

    return thresholds[entityType]?.[window] || 100;
  }
}
