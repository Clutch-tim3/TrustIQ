import { PrismaClient } from '@prisma/client';
import { Job } from 'bullmq';
import { VelocityService } from '../services/velocity.service.js';

const prisma = new PrismaClient();
const velocityService = new VelocityService();

export class EventProcessorJob {
  async process(job: Job): Promise<void> {
    const { event } = job.data;
    
    try {
      // Store the event in the database
      await prisma.behaviourEvent.create({
        data: {
          external_user_id: event.user_id,
          developer_api_key_hash: event.api_key_hash,
          event_type: event.event,
          ip: event.ip,
          device_fingerprint_hash: event.device_fingerprint_hash,
          metadata: event.metadata,
          timestamp: event.timestamp || new Date()
        }
      });
      
      // Update velocity buckets
      if (event.ip) {
        await velocityService.updateVelocity('ip', event.ip, event.api_key_hash);
      }
      
      // Update user profile last seen time
      const userProfile = await prisma.userProfile.findFirst({
        where: {
          external_user_id: event.user_id,
          developer_api_key_hash: event.api_key_hash
        }
      });
      
      if (userProfile) {
        await prisma.userProfile.update({
          where: { id: userProfile.id },
          data: {
            last_seen: new Date()
          }
        });
      }
      
      // Check for velocity anomalies
      if (event.ip) {
        const velocityCheck = await velocityService.checkVelocity('ip', event.ip, event.api_key_hash);
        const isAnomalous = Object.values(velocityCheck).some(window => window.is_anomalous);
        if (isAnomalous) {
          console.warn(`Velocity anomaly detected for user ${event.user_id} on event ${event.event}`);
          // TODO: Create anomaly alert
        }
      }
    } catch (error) {
      console.error(`Failed to process event for user ${event.user_id}:`, error);
      throw error;
    }
  }

  async handleFailure(job: Job): Promise<void> {
    console.error(`Job failed ${job.attemptsMade} times:`, job.failedReason);
    // TODO: Implement failure handling logic
  }
}