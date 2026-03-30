import { PrismaClient } from '@prisma/client';
import { Job } from 'bullmq';
import { ScoreCalculator } from '../services/scoreCalculator.service.js';

const prisma = new PrismaClient();
const scoreCalculator = new ScoreCalculator();

export class ProfileUpdaterJob {
  async process(job: Job): Promise<void> {
    const { userId, apiKeyHash } = job.data;
    
    try {
      console.log(`Updating user profile for ${userId}...`);
      
      // Get user profile
      const userProfile = await prisma.userProfile.findFirst({
        where: {
          external_user_id: userId,
          developer_api_key_hash: apiKeyHash
        },
        include: {
          assessments: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          events: {
            orderBy: { timestamp: 'desc' },
            take: 50
          }
        }
      });
      
      if (!userProfile) {
        console.warn(`User profile not found for ${userId}`);
        return;
      }
      
      // Calculate new trust score based on recent activity
      const recentSignals = this.extractSignalsFromActivity(userProfile);
      const { totalScore } = ScoreCalculator.calculateTotalScore(recentSignals);
      
      // Update user profile
      await prisma.userProfile.update({
        where: { id: userProfile.id },
        data: {
          trust_score: totalScore,
          account_age_days: Math.floor((Date.now() - new Date(userProfile.first_seen).getTime()) / (1000 * 60 * 60 * 24)),
          total_assessments: userProfile.assessments.length,
          flagged_count: userProfile.assessments.filter(a => a.verdict === 'block' || a.verdict === 'challenge').length
        }
      });
      
      console.log(`User profile updated for ${userId}. New score: ${totalScore.toFixed(1)}`);
    } catch (error) {
      console.error(`Profile update failed for ${userId}:`, error);
      throw error;
    }
  }

  private extractSignalsFromActivity(userProfile: any): any {
    // TODO: Extract meaningful signals from assessments and events
    return {
      userHistory: {
        account_age_days: Math.floor((Date.now() - new Date(userProfile.first_seen).getTime()) / (1000 * 60 * 60 * 24)),
        prior_trust_score: userProfile.trust_score,
        prior_flags: userProfile.flagged_count,
        linked_to_flagged_user: false
      }
    };
  }

  async handleFailure(job: Job): Promise<void> {
    console.error(`Job failed ${job.attemptsMade} times:`, job.failedReason);
    // TODO: Implement failure handling logic
  }
}