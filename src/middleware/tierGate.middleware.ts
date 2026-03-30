import { Request, Response, NextFunction } from 'express';

const TIER_FEATURES = {
  FREE: ['/v1/assess'],
  STARTER: ['/v1/assess', '/v1/assess/email', '/v1/assess/ip', '/v1/assess/device', '/v1/assess/phone', '/v1/events/track', '/v1/events/report', '/v1/users', '/v1/config'],
  PRO: ['/v1/assess', '/v1/assess/email', '/v1/assess/ip', '/v1/assess/device', '/v1/assess/phone', '/v1/events/track', '/v1/events/report', '/v1/users', '/v1/config', '/v1/anomalies', '/v1/stats', '/v1/velocity'],
  SCALE: ['/v1/assess', '/v1/assess/email', '/v1/assess/ip', '/v1/assess/device', '/v1/assess/phone', '/v1/assess/identity', '/v1/assess/batch', '/v1/events/track', '/v1/events/report', '/v1/users', '/v1/config', '/v1/anomalies', '/v1/stats', '/v1/velocity'],
  ENTERPRISE: ['*']
};

export const tierGate = (req: Request, res: Response, next: NextFunction): void => {
  const apiTier = (req as any).apiTier || 'STARTER';
  const endpoint = req.originalUrl.split('?')[0];

  const allowedEndpoints = TIER_FEATURES[apiTier as keyof typeof TIER_FEATURES];

  const isAllowed = allowedEndpoints.some(allowedPattern => {
    if (allowedPattern === '*') return true;
    if (allowedPattern.endsWith('/*')) {
      return endpoint.startsWith(allowedPattern.slice(0, -2));
    }
    return endpoint === allowedPattern;
  });

  if (!isAllowed) {
    res.status(403).json({
      success: false,
      error: {
        code: 'tier_feature_restriction',
        message: `This endpoint is not available on your ${apiTier} tier. Upgrade to access this feature.`,
        docs_url: 'https://docs.trustiq.io/pricing'
      },
      meta: {
        request_id: req.headers['x-request-id'] || 'anonymous',
        version: '1.0.0',
        processing_ms: Date.now() - (req as any).startTime
      }
    });
    return;
  }

  next();
};
