import express from 'express';
import { VelocityController } from '../controllers/velocity.controller.js';

const router = express.Router();

router.get('/check', VelocityController.checkVelocity);

export default router;
