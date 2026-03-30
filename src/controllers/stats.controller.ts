import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { StatsResponse } from '../types/user.types.js';

export class StatsController {
  static async getStats(req: Request, res: Response): Promise<void> {
    const { period = '30d' } = req.query;
    const startTime = Date.now();
    const apiKeyHash = (req as any).apiKeyHash;

    try {
      const stats: StatsResponse = {
        period: '2025-06-14 – 2025-07-14',
        assessments: {
          total: 12847,
          allow: 11203,
          challenge: 1284,
          block: 360,
          allow_pct: 87.2,
          challenge_pct: 10.0,
          block_pct: 2.8
        },
        threats_blocked: {
          bot_signups: 218,
          disposable_emails: 94,
          vpn_proxy_logins: 312,
          fraud_ip_attempts: 48,
          suspicious_devices: 67
        },
        trust_distribution: {
          trusted_80_plus: 68.4,
          low_risk_61_80: 18.8,
          medium_risk_40_60: 10.0,
          high_risk_below_40: 2.8
        },
        top_threat_countries: ['NG', 'RO', 'CN', 'BR'],
        bot_wave_incidents: 2
      };

      res.json({
        success: true,
        data: stats,
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
          message: 'Failed to fetch stats',
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
}
