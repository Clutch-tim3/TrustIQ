import express from 'express';
import { UsersController } from '../controllers/users.controller.js';
import { validateSchema } from '../middleware/validation.middleware.js';
import { z } from 'zod';

const router = express.Router();

const updateTrustScoreSchema = z.object({
  adjustment: z.enum(['increase', 'decrease', 'set']),
  value: z.number(),
  reason: z.enum(['manual_review_cleared', 'fraud_confirmed', 'identity_verified', 'chargeback_received']),
  notes: z.string().optional()
});

router.get('/:user_id/profile', UsersController.getUserProfile);
router.patch('/:user_id/trust-score', validateSchema(updateTrustScoreSchema), UsersController.updateTrustScore);
router.get('/:user_id/linked-accounts', UsersController.getLinkedAccounts);

export default router;
