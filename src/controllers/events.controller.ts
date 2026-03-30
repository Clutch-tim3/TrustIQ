import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { eventQueue } from '../config/bullmq.js';
import { hashEmail, hashPhone, hashIp } from '../utils/hashUtils.js';
import { TrackEventRequestBody, ReportEventRequestBody } from '../types/assessment.types.js';

export class EventsController {
  static async trackEvent(req: Request, res: Response): Promise<void> {
    const requestBody: TrackEventRequestBody = req.body;
    const startTime = Date.now();
    const apiKeyHash = (req as any).apiKeyHash;

    try {
      await eventQueue.add('track-event', {
        ...requestBody,
        apiKeyHash
      });

      res.status(202).json({
        success: true,
        data: {
          accepted: true,
          event: requestBody.event,
          user_id: requestBody.user_id
        },
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
          message: 'Event tracking failed',
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

  static async reportEvent(req: Request, res: Response): Promise<void> {
    const requestBody: ReportEventRequestBody = req.body;
    const startTime = Date.now();
    const apiKeyHash = (req as any).apiKeyHash;

    try {
      const userProfile = await prisma.userProfile.findFirst({
        where: {
          external_user_id: requestBody.user_id,
          developer_api_key_hash: apiKeyHash
        }
      });

      if (userProfile) {
        await prisma.userProfile.update({
          where: { id: userProfile.id },
          data: {
            flagged_count: { increment: 1 },
            trust_score: Math.max(0, userProfile.trust_score - 20),
            risk_level: userProfile.trust_score - 20 < 40 ? 'high' : 'medium'
          }
        });
      }

      if (requestBody.email) {
        const domain = requestBody.email.split('@')[1];
        await prisma.emailReputation.updateMany({
          where: { domain },
          data: { fraud_reports: { increment: 1 } }
        });
      }

      if (requestBody.ip) {
        await prisma.ipReputation.updateMany({
          where: { ip: requestBody.ip },
          data: { fraud_reports: { increment: 1 } }
        });
      }

      if (requestBody.device_fingerprint_hash) {
        await prisma.deviceFingerprint.updateMany({
          where: { fingerprint_hash: requestBody.device_fingerprint_hash },
          data: { fraud_reports: { increment: 1 } }
        });
      }

      res.json({
        success: true,
        data: {
          reported: true,
          signal_updated: true
        },
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
          message: 'Event reporting failed',
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
