import express from 'express';
import { ConfigController } from '../controllers/config.controller.js';
import { validateSchema } from '../middleware/validation.middleware.js';
import { z } from 'zod';

const router = express.Router();

const configSchema = z.object({
  thresholds: z.object({
    allow: z.number(),
    challenge: z.number(),
    block: z.number()
  }),
  action_overrides: z.record(z.object({
    allow: z.number(),
    challenge: z.number(),
    block: z.number()
  })).optional()
});

router.get('/thresholds', ConfigController.getThresholds);
router.post('/thresholds', validateSchema(configSchema), ConfigController.updateThresholds);

export default router;
