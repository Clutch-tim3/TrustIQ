import express from 'express';
import { StatsController } from '../controllers/stats.controller.js';

const router = express.Router();

router.get('/', StatsController.getStats);

export default router;
