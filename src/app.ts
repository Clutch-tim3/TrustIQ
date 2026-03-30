import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import xss from 'xss-clean';
import swaggerUi from 'swagger-ui-express';
import 'express-async-errors';

import assessRoutes from './routes/assess.routes.js';
import eventsRoutes from './routes/events.routes.js';
import usersRoutes from './routes/users.routes.js';
import velocityRoutes from './routes/velocity.routes.js';
import anomaliesRoutes from './routes/anomalies.routes.js';
import configRoutes from './routes/config.routes.js';
import statsRoutes from './routes/stats.routes.js';
import healthRoutes from './routes/health.routes.js';

import { authenticateApiKey, getApiTier } from './middleware/auth.middleware.js';
import { rateLimit } from './middleware/rateLimit.middleware.js';
import { tierGate } from './middleware/tierGate.middleware.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(hpp());
app.use(xss());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  (req as any).startTime = Date.now();
  const apiKey = req.headers['x-rapidapi-key'] as string;
  const apiKeyHash = apiKey ? (req as any).apiKeyHash : null;
  (req as any).apiTier = apiKey ? getApiTier(apiKeyHash) : 'STARTER';
  next();
});

app.use(authenticateApiKey);
app.use(rateLimit);
app.use(tierGate);

app.use('/v1/assess', assessRoutes);
app.use('/v1/events', eventsRoutes);
app.use('/v1/users', usersRoutes);
app.use('/v1/velocity', velocityRoutes);
app.use('/v1/anomalies', anomaliesRoutes);
app.use('/v1/config', configRoutes);
app.use('/v1/stats', statsRoutes);
app.use('/v1/health', healthRoutes);

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Application error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: {
      code: error.code || 'internal_error',
      message: error.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      docs_url: 'https://docs.trustiq.io/errors'
    },
    meta: {
      request_id: req.headers['x-request-id'] || 'anonymous',
      version: '1.0.0',
      processing_ms: Date.now() - (req as any).startTime,
      from_cache: false
    }
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'not_found',
      message: 'Endpoint not found',
      docs_url: 'https://docs.trustiq.io'
    },
    meta: {
      request_id: req.headers['x-request-id'] || 'anonymous',
      version: '1.0.0',
      processing_ms: Date.now() - (req as any).startTime,
      from_cache: false
    }
  });
});

export default app;
