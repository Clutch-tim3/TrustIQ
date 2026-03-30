import { PrismaClient } from '@prisma/client';
import { Job } from 'bullmq';

const prisma = new PrismaClient();

export class VelocityCleanupJob {
  async process(job: Job): Promise<void> {
    try {
      console.log('Starting velocity bucket cleanup...');
      
      // Cleanup expired velocity buckets
      const expiredCount = await prisma.velocityBucket.deleteMany({
        where: {
          expires_at: {
            lt: new Date()
          }
        }
      });
      
      console.log(`Velocity cleanup completed. ${expiredCount.count} expired buckets removed.`);
    } catch (error) {
      console.error('Velocity cleanup failed:', error);
      throw error;
    }
  }

  async handleFailure(job: Job): Promise<void> {
    console.error(`Job failed ${job.attemptsMade} times:`, job.failedReason);
    // TODO: Implement failure handling logic
  }
}