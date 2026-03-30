import express from 'express';
import { EventsController } from '../controllers/events.controller.js';
import { validateSchema } from '../middleware/validation.middleware.js';
import { z } from 'zod';

const router = express.Router();

const trackEventSchema = z.object({
  user_id: z.string(),
  event: z.string(),
  ip: z.string().optional(),
  device_fingerprint_hash: z.string().optional(),
  timestamp: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const reportEventSchema = z.object({
  user_id: z.string(),
  report_type: z.enum(['fraud', 'fake_account', 'chargeback', 'spam', 'tos_violation', 'bot', 'identity_theft']),
  confirmed: z.boolean(),
  details: z.string(),
  email: z.string().email().optional(),
  ip: z.string().optional(),
  device_fingerprint_hash: z.string().optional()
});

router.post('/track', validateSchema(trackEventSchema), EventsController.trackEvent);
router.post('/report', validateSchema(reportEventSchema), EventsController.reportEvent);

export default router;
