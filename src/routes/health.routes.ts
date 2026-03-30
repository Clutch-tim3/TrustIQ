import express from 'express';
import { HealthController } from '../controllers/health.controller.js';

const router = express.Router();

router.get('/', HealthController.health);

export default router;
