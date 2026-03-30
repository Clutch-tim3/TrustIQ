import express from 'express';
import { AnomaliesController } from '../controllers/anomalies.controller.js';

const router = express.Router();

router.get('/', AnomaliesController.getAnomalies);

export default router;
