import { Request, Response } from 'express';
import { ConfigThresholdsRequestBody } from '../types/assessment.types.js';

export class ConfigController {
  static async getThresholds(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      res.json({
        success: true,
        data: {
          thresholds: {
            allow: parseInt(process.env.DEFAULT_ALLOW_THRESHOLD || '61'),
            challenge: parseInt(process.env.DEFAULT_CHALLENGE_THRESHOLD || '40'),
            block: parseInt(process.env.DEFAULT_BLOCK_THRESHOLD || '20')
          },
          action_overrides: {}
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
          message: 'Failed to fetch thresholds',
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

  static async updateThresholds(req: Request, res: Response): Promise<void> {
    const { thresholds, action_overrides } = req.body as ConfigThresholdsRequestBody;
    const startTime = Date.now();

    try {
      res.json({
        success: true,
        data: {
          thresholds,
          action_overrides
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
          message: 'Failed to update thresholds',
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
