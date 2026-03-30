import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateSchema = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'validation_error',
            message: 'Invalid request body',
            details: error.issues.map(issue => ({
              path: issue.path.join('.'),
              message: issue.message
            })),
            docs_url: 'https://docs.trustiq.io/validation'
          },
          meta: {
            request_id: req.headers['x-request-id'] || 'anonymous',
            version: '1.0.0',
            processing_ms: Date.now() - (req as any).startTime
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'invalid_request',
            message: 'Invalid request body',
            docs_url: 'https://docs.trustiq.io/validation'
          },
          meta: {
            request_id: req.headers['x-request-id'] || 'anonymous',
            version: '1.0.0',
            processing_ms: Date.now() - (req as any).startTime
          }
        });
      }
    }
  };
};
