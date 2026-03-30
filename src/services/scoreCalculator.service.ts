import { DeviceFingerprint, BehaviourData } from '../types/assessment.types.js';

export interface SignalWeights {
  ip?: {
    score: number;
    factors: string[];
  };
  email?: {
    score: number;
    factors: string[];
  };
  device?: {
    score: number;
    factors: string[];
  };
  behaviour?: {
    score: number;
    factors: string[];
  };
  userHistory?: {
    score: number;
    factors: string[];
  };
}

export interface SignalData {
  ip?: {
    is_vpn: boolean;
    is_proxy: boolean;
    is_tor: boolean;
    is_datacenter: boolean;
    abuse_score: number;
    velocity_1h: number;
    velocity_24h: number;
    is_residential: boolean;
    has_clean_reputation: boolean;
  };
  email?: {
    is_disposable: boolean;
    has_mx_records: boolean;
    is_free_provider: boolean;
    domain_age_days?: number;
    has_random_pattern: boolean;
    domain_velocity_24h: number;
    is_corporate?: boolean;
    has_dmarc: boolean;
  };
  device?: {
    is_headless: boolean;
    has_webdriver: boolean;
    is_automation: boolean;
    device_age_hours: number;
    unique_users_count: number;
    linked_to_flagged_account: boolean;
    device_age_days?: number;
    has_single_account?: boolean;
  };
  behaviour?: BehaviourData;
  userHistory?: {
    account_age_days?: number;
    prior_trust_score?: number;
    prior_flags: number;
    linked_to_flagged_user: boolean;
  };
}

export class ScoreCalculator {
  static calculateTotalScore(signals: SignalData, action: string = 'general'): {
    totalScore: number;
    weights: SignalWeights;
    riskFactors: string[];
    positiveFactors: string[];
  } {
    let baseScore = 50;
    const weights: SignalWeights = {};
    const riskFactors: string[] = [];
    const positiveFactors: string[] = [];

    // Calculate each signal's contribution
    if (signals.ip) {
      const { score, factors, positives } = this.calculateIpScore(signals.ip);
      weights.ip = { score, factors };
      baseScore += score;
      riskFactors.push(...factors);
      positiveFactors.push(...positives);
    }

    if (signals.email) {
      const { score, factors, positives } = this.calculateEmailScore(signals.email, action);
      weights.email = { score, factors };
      baseScore += score;
      riskFactors.push(...factors);
      positiveFactors.push(...positives);
    }

    if (signals.device) {
      const { score, factors, positives } = this.calculateDeviceScore(signals.device);
      weights.device = { score, factors };
      baseScore += score;
      riskFactors.push(...factors);
      positiveFactors.push(...positives);
    }

    if (signals.behaviour) {
      const { score, factors, positives } = this.calculateBehaviourScore(signals.behaviour);
      weights.behaviour = { score, factors };
      baseScore += score;
      riskFactors.push(...factors);
      positiveFactors.push(...positives);
    }

    if (signals.userHistory) {
      const { score, factors, positives } = this.calculateUserHistoryScore(signals.userHistory);
      weights.userHistory = { score, factors };
      baseScore += score;
      riskFactors.push(...factors);
      positiveFactors.push(...positives);
    }

    // Clamp score to 0-100 range
    const totalScore = Math.max(0, Math.min(100, baseScore));

    return {
      totalScore,
      weights,
      riskFactors,
      positiveFactors
    };
  }

  private static calculateIpScore(ip: SignalData['ip']): {
    score: number;
    factors: string[];
    positives: string[];
  } {
    let score = 0;
    const factors: string[] = [];
    const positives: string[] = [];

    if (!ip) return { score, factors, positives };

    if (ip.is_vpn) {
      score -= 8;
      factors.push('VPN detected — IP origin obscured');
    }
    if (ip.is_proxy) {
      score -= 12;
      factors.push('Proxy server detected');
    }
    if (ip.is_tor) {
      score -= 20;
      factors.push('Tor network detected');
    }
    if (ip.is_datacenter) {
      score -= 10;
      factors.push('Datacenter IP address');
    }
    if (ip.abuse_score > 50) {
      score -= 15;
      factors.push(`IP has high abuse score (${ip.abuse_score}/100)`);
    }
    if (ip.velocity_1h > 50) {
      score -= 20;
      factors.push(`Extreme IP velocity: ${ip.velocity_1h} signups/hour`);
    } else if (ip.velocity_1h > 10) {
      score -= 10;
      factors.push(`High IP velocity: ${ip.velocity_1h} signups/hour`);
    }
    if (ip.is_residential && ip.has_clean_reputation) {
      score += 5;
      positives.push('Residential IP with clean reputation');
    }

    return { score, factors, positives };
  }

  private static calculateEmailScore(email: SignalData['email'], action: string): {
    score: number;
    factors: string[];
    positives: string[];
  } {
    let score = 0;
    const factors: string[] = [];
    const positives: string[] = [];

    if (!email) return { score, factors, positives };

    if (email.is_disposable) {
      score -= 15;
      factors.push('Disposable email domain detected');
    }
    if (!email.has_mx_records) {
      score -= 20;
      factors.push('Email domain has no MX records');
    }
    if (email.is_free_provider && (action === 'business' || action.includes('payment'))) {
      score -= 5;
      factors.push('Free email provider for business transaction');
    }
    if (email.domain_age_days && email.domain_age_days < 30) {
      score -= 10;
      factors.push(`Email domain registered ${email.domain_age_days} days ago`);
    }
    if (email.has_random_pattern) {
      score -= 8;
      factors.push('Email has random character pattern');
    }
    if (email.domain_velocity_24h > 20) {
      score -= 8;
      factors.push(`High email domain velocity: ${email.domain_velocity_24h} signups/day`);
    }
    if (email.is_corporate && email.has_dmarc) {
      score += 10;
      positives.push('Corporate email domain with valid DMARC');
    }
    if (email.domain_age_days && email.domain_age_days > 1825) {
      score += 5;
      positives.push('Email domain is over 5 years old');
    }

    return { score, factors, positives };
  }

  private static calculateDeviceScore(device: SignalData['device']): {
    score: number;
    factors: string[];
    positives: string[];
  } {
    let score = 0;
    const factors: string[] = [];
    const positives: string[] = [];

    if (!device) return { score, factors, positives };

    if (device.is_headless) {
      score -= 15;
      factors.push('Headless browser detected');
    }
    if (device.has_webdriver) {
      score -= 20;
      factors.push('WebDriver automation detected');
    }
    if (device.is_automation) {
      score -= 20;
      factors.push('Automation framework detected');
    }
    if (device.device_age_hours < 1) {
      score -= 5;
      factors.push('New device fingerprint detected');
    }
    if (device.unique_users_count >= 5) {
      score -= 10;
      factors.push(`Device linked to ${device.unique_users_count} different accounts`);
    }
    if (device.linked_to_flagged_account) {
      score -= 15;
      factors.push('Device linked to previously flagged account');
    }
    if (device.device_age_days && device.device_age_days > 30) {
      score += 10;
      positives.push(`Device seen consistently for ${device.device_age_days} days`);
    }
    if (device.has_single_account) {
      score += 5;
      positives.push('Device used exclusively by this user');
    }

    return { score, factors, positives };
  }

  private static calculateBehaviourScore(behaviour: BehaviourData): {
    score: number;
    factors: string[];
    positives: string[];
  } {
    let score = 0;
    const factors: string[] = [];
    const positives: string[] = [];

    if (behaviour.time_to_complete_seconds < 3) {
      score -= 12;
      factors.push('Form completed in less than 3 seconds');
    } else if (behaviour.time_to_complete_seconds < 8) {
      score -= 5;
      factors.push('Form completed in less than 8 seconds');
    } else if (behaviour.time_to_complete_seconds >= 15 && behaviour.time_to_complete_seconds <= 120) {
      score += 8;
      positives.push(`Human-typical form completion time (${behaviour.time_to_complete_seconds} seconds)`);
    }

    if (!behaviour.mouse_movements && !behaviour.keyboard_events) {
      score -= 10;
      factors.push('No mouse or keyboard activity detected');
    }

    if (behaviour.copy_paste_detected) {
      score -= 8;
      factors.push('Copy-paste detected in critical fields');
    }

    if (behaviour.scroll_events > 0) {
      score += 3;
      positives.push('Scroll events detected');
    }

    return { score, factors, positives };
  }

  private static calculateUserHistoryScore(userHistory: SignalData['userHistory']): {
    score: number;
    factors: string[];
    positives: string[];
  } {
    let score = 0;
    const factors: string[] = [];
    const positives: string[] = [];

    if (!userHistory) return { score, factors, positives };

    if (userHistory.account_age_days) {
      if (userHistory.account_age_days > 365) {
        score += 15;
        positives.push('Account over 1 year old');
      } else if (userHistory.account_age_days > 90) {
        score += 10;
        positives.push('Account over 90 days old');
      }
    }

    if (userHistory.prior_trust_score && userHistory.prior_trust_score > 80) {
      score += 10;
      positives.push('Prior high trust score');
    }

    if (userHistory.prior_flags > 3) {
      score -= 20;
      factors.push(`User has ${userHistory.prior_flags} previous trust flags`);
    } else if (userHistory.prior_flags > 0) {
      score -= 10;
      factors.push(`User has ${userHistory.prior_flags} previous trust flags`);
    }

    if (userHistory.linked_to_flagged_user) {
      score -= 15;
      factors.push('User linked to flagged account');
    }

    return { score, factors, positives };
  }
}
