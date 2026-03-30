import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { UserProfileResponse, LinkedAccount } from '../types/user.types.js';
import { UpdateTrustScoreRequestBody } from '../types/assessment.types.js';

export class UsersController {
  static async getUserProfile(req: Request, res: Response): Promise<void> {
    const { user_id } = req.params;
    const apiKeyHash = (req as any).apiKeyHash;
    const startTime = Date.now();

    try {
      const userProfile = await prisma.userProfile.findFirst({
        where: {
          external_user_id: user_id,
          developer_api_key_hash: apiKeyHash
        }
      });

      if (!userProfile) {
        res.status(404).json({
          success: false,
          error: {
            code: 'user_not_found',
            message: 'User profile not found',
            docs_url: 'https://docs.trustiq.io/users'
          },
          meta: {
            request_id: req.headers['x-request-id'] || 'anonymous',
            version: '1.0.0',
            processing_ms: Date.now() - startTime,
            from_cache: false
          }
        });
        return;
      }

      const response: UserProfileResponse = {
        user_id,
        trust_score: userProfile.trust_score,
        risk_level: userProfile.risk_level as 'low' | 'medium' | 'high' | 'critical',
        account_age_days: userProfile.account_age_days,
        first_seen: userProfile.first_seen.toISOString(),
        last_seen: userProfile.last_seen.toISOString(),
        total_assessments: userProfile.total_assessments,
        flagged_count: userProfile.flagged_count,
        known_devices: [],
        known_locations: [],
        behaviour_patterns: {},
        linked_accounts: [],
        risk_history: []
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
          message: 'Failed to fetch user profile',
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

  static async updateTrustScore(req: Request, res: Response): Promise<void> {
    const { user_id } = req.params;
    const { adjustment, value, reason, notes } = req.body as UpdateTrustScoreRequestBody;
    const apiKeyHash = (req as any).apiKeyHash;
    const startTime = Date.now();

    try {
      const userProfile = await prisma.userProfile.findFirst({
        where: {
          external_user_id: user_id,
          developer_api_key_hash: apiKeyHash
        }
      });

      if (!userProfile) {
        res.status(404).json({
          success: false,
          error: {
            code: 'user_not_found',
            message: 'User profile not found',
            docs_url: 'https://docs.trustiq.io/users'
          },
          meta: {
            request_id: req.headers['x-request-id'] || 'anonymous',
            version: '1.0.0',
            processing_ms: Date.now() - startTime,
            from_cache: false
          }
        });
        return;
      }

      let newScore = userProfile.trust_score;

      switch (adjustment) {
        case 'increase':
          newScore = Math.min(100, userProfile.trust_score + value);
          break;
        case 'decrease':
          newScore = Math.max(0, userProfile.trust_score - value);
          break;
        case 'set':
          newScore = Math.max(0, Math.min(100, value));
          break;
      }

      let newRiskLevel = userProfile.risk_level;
      if (newScore >= 80) {
        newRiskLevel = 'low';
      } else if (newScore >= 61) {
        newRiskLevel = 'medium';
      } else if (newScore >= 40) {
        newRiskLevel = 'high';
      } else {
        newRiskLevel = 'critical';
      }

      await prisma.userProfile.update({
        where: { id: userProfile.id },
        data: {
          trust_score: newScore,
          risk_level: newRiskLevel
        }
      });

      res.json({
        success: true,
        data: {
          user_id,
          previous_score: userProfile.trust_score,
          new_score: newScore,
          risk_level: newRiskLevel,
          reason,
          notes
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
          message: 'Failed to update trust score',
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

  static async getLinkedAccounts(req: Request, res: Response): Promise<void> {
    const { user_id } = req.params;
    const apiKeyHash = (req as any).apiKeyHash;
    const startTime = Date.now();

    try {
      const linkedAccounts: LinkedAccount[] = [];

      res.json({
        success: true,
        data: {
          user_id,
          linked_accounts: linkedAccounts,
          network_size: linkedAccounts.length,
          network_risk_level: linkedAccounts.length > 0 ? 'elevated' : 'low'
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
          message: 'Failed to fetch linked accounts',
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
