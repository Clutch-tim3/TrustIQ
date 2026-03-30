import { PrismaClient } from '@prisma/client';
import type { UserHistorySignals } from '../types/signals.types.js';

const prisma = new PrismaClient();

export class UserHistoryService {
  async analyze(userId: string, apiKeyHash: string): Promise<UserHistorySignals> {
    const userProfile = await prisma.userProfile.findFirst({
      where: {
        external_user_id: userId,
        developer_api_key_hash: apiKeyHash
      }
    });

    if (!userProfile) {
      return {
        score_contribution: 0,
        account_age_days: undefined,
        prior_assessments: 0,
        prior_flags: 0
      };
    }

    const [
      assessmentCount,
      flaggedCount
    ] = await Promise.all([
      prisma.assessment.count({
        where: {
          external_user_id: userId,
          developer_api_key_hash: apiKeyHash
        }
      }),
      Promise.resolve(userProfile.flagged_count)
    ]);

    const scoreContribution = this.calculateScore({
      accountAgeDays: userProfile.account_age_days,
      priorTrustScore: userProfile.trust_score,
      priorFlags: flaggedCount,
      linkedToFlaggedUser: this.isLinkedToFlaggedUser(userProfile.linked_user_ids)
    });

    return {
      score_contribution: scoreContribution,
      account_age_days: userProfile.account_age_days,
      prior_assessments: assessmentCount,
      prior_flags: flaggedCount
    };
  }

  private isLinkedToFlaggedUser(linkedUserIds: string[]): boolean {
    // TODO: Implement linked to flagged user check
    return false;
  }

  private calculateScore(params: {
    accountAgeDays: number;
    priorTrustScore: number;
    priorFlags: number;
    linkedToFlaggedUser: boolean;
  }): number {
    let score = 0;

    if (params.accountAgeDays > 365) score += 15;
    else if (params.accountAgeDays > 90) score += 10;

    if (params.priorTrustScore > 80) score += 10;

    if (params.priorFlags > 3) score -= 20;
    else if (params.priorFlags > 0) score -= 10;

    if (params.linkedToFlaggedUser) score -= 15;

    return score;
  }
}