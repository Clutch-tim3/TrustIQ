import { Request, Response, NextFunction } from 'express';
import { hashApiKey } from '../utils/hashUtils.js';

export const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-rapidapi-key'] as string;

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: {
        code: 'missing_api_key',
        message: 'API key is required in x-rapidapi-key header',
        docs_url: 'https://docs.trustiq.io/authentication'
      },
      meta: {
        request_id: req.headers['x-request-id'] || 'anonymous',
        version: '1.0.0',
        processing_ms: Date.now() - (req as any).startTime
      }
    });
    return;
  }

  const apiKeyHash = hashApiKey(apiKey);
  
  (req as any).apiKeyHash = apiKeyHash;
  (req as any).apiKey = apiKey;

  next();
};

export const getApiTier = (apiKeyHash: string): string => {
  const freeKeys = new Set([
    hashApiKey('demo-key')
  ]);

  if (freeKeys.has(apiKeyHash)) {
    return 'FREE';
  }

  return 'STARTER';
};
