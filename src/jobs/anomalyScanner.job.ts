import { PrismaClient } from '@prisma/client';
import { Job } from 'bullmq';
import { AnomalyDetectionService } from '../services/anomalyDetection.service.js';

const prisma = new PrismaClient();
const anomalyDetectionService = new AnomalyDetectionService();

export class AnomalyScannerJob {
  async process(job: Job): Promise<void> {
    try {
      console.log('Starting anomaly scan...');
      
      // Get all active API keys (from ApiUsage table)
      const activeApiKeys = await prisma.apiUsage.groupBy({
        by: ['api_key_hash'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        _count: { api_key_hash: true }
      });
      
      // Scan for anomalies for each active API key
      for (const apiKey of activeApiKeys) {
        const anomalies = await anomalyDetectionService.detectAnomalies(
          apiKey.api_key_hash,
          'all',
          'all',
          24 // Last 24 hours
        );
        
        for (const anomaly of anomalies) {
          // TODO: Create anomaly record in database
          // TODO: Send alert to developer if configured
          console.log(`Anomaly detected for API key ${apiKey.api_key_hash.substring(0, 8)}:`, anomaly.title);
        }
      }
      
      console.log('Anomaly scan completed');
    } catch (error) {
      console.error('Anomaly scan failed:', error);
      throw error;
    }
  }

  async handleFailure(job: Job): Promise<void> {
    console.error(`Job failed ${job.attemptsMade} times:`, job.failedReason);
    // TODO: Implement failure handling logic
  }
}