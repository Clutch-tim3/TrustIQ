export interface ThresholdConfig {
  allow: number;
  challenge: number;
  block: number;
}

export interface ActionOverrides {
  [action: string]: ThresholdConfig;
}

export interface VerdictConfig {
  thresholds: ThresholdConfig;
  action_overrides?: ActionOverrides;
}

export class VerdictEngine {
  static determineVerdict(
    score: number,
    action: string = 'general',
    config?: Partial<VerdictConfig>
  ): {
    verdict: 'allow' | 'challenge' | 'block' | 'manual_review';
    risk_level: 'critical' | 'high' | 'medium' | 'low';
    confidence: 'high' | 'medium' | 'low';
  } {
    const defaultConfig: VerdictConfig = {
      thresholds: {
        allow: 61,
        challenge: 40,
        block: 20
      }
    };

    const mergedConfig = { ...defaultConfig, ...config };

    const thresholds = mergedConfig.action_overrides?.[action] || mergedConfig.thresholds;

    let verdict: 'allow' | 'challenge' | 'block' | 'manual_review';
    let riskLevel: 'critical' | 'high' | 'medium' | 'low';

    if (score >= thresholds.allow) {
      verdict = 'allow';
      riskLevel = score >= 80 ? 'low' : 'medium';
    } else if (score >= thresholds.challenge) {
      verdict = 'challenge';
      riskLevel = score >= 60 ? 'medium' : 'high';
    } else if (score >= thresholds.block) {
      verdict = 'challenge';
      riskLevel = 'high';
    } else {
      verdict = 'block';
      riskLevel = 'critical';
    }

    const confidence = this.calculateConfidence(score, action);

    return {
      verdict,
      risk_level: riskLevel,
      confidence
    };
  }

  private static calculateConfidence(score: number, action: string): 'high' | 'medium' | 'low' {
    const actionComplexity = this.getActionComplexity(action);
    
    if (score >= 80 || score <= 20) {
      return 'high';
    } else if (score >= 60 || score <= 40) {
      return actionComplexity === 'high' ? 'medium' : 'high';
    } else {
      return 'medium';
    }
  }

  private static getActionComplexity(action: string): 'low' | 'medium' | 'high' {
    const highComplexityActions = ['payment', 'withdrawal', 'listing_create'];
    const mediumComplexityActions = ['signup', 'login', 'content_post'];
    
    if (highComplexityActions.includes(action)) {
      return 'high';
    } else if (mediumComplexityActions.includes(action)) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  static getChallengeOptions(verdict: string, score: number): any | null {
    if (verdict !== 'challenge') {
      return null;
    }

    if (score >= 60) {
      return {
        recommended: 'email_otp',
        alternatives: ['sms_otp', 'captcha']
      };
    } else if (score >= 40) {
      return {
        recommended: 'sms_otp',
        alternatives: ['email_otp', 'captcha']
      };
    } else {
      return {
        recommended: 'captcha',
        alternatives: ['sms_otp', 'email_otp']
      };
    }
  }

  static generateRecommendation(
    verdict: string,
    score: number,
    riskFactors: string[],
    positiveFactors: string[]
  ): string {
    if (verdict === 'allow') {
      if (score >= 80) {
        return 'Allow. User shows strong trust signals across all dimensions.';
      } else {
        return 'Allow with monitoring. User has mostly positive signals.';
      }
    }

    if (verdict === 'block') {
      return 'Block. User has multiple high-risk signals indicating fraud or automation.';
    }

    if (verdict === 'challenge') {
      if (score >= 60) {
        return 'Challenge with email OTP. Some risk signals require verification.';
      } else {
        return 'Strong challenge recommended (SMS OTP or CAPTCHA). High-risk signals detected.';
      }
    }

    return 'Manual review recommended. Complex risk pattern requires human judgment.';
  }
}
