import { PrismaClient } from '@prisma/client';
import { EmailSignalsService } from './emailSignals.service';
import { IpSignalsService } from './ipSignals.service';
import { DeviceSignalsService } from './deviceSignals.service';
import { BehaviourSignalsService } from './behaviourSignals.service';
import { UserHistoryService } from './userHistory.service';
import { VelocityService } from './velocity.service';
import { ScoreCalculator } from './scoreCalculator.service';
import { VerdictEngine } from './verdictEngine.service';
import { LinkedAccountsService } from './linkedAccounts.service';
import { AiService } from './ai.service';
import { sha256, hashEmail, hashPhone, hashIp } from '../utils/hashUtils';
import { generateFingerprintHash } from '../utils/fingerprintHash';
import { extractDomain } from '../utils/emailUtils';
import { isValidIp } from '../utils/ipUtils';
import type { AssessRequestBody } from '../types/assessment.types';

const prisma = new PrismaClient();

export class AssessService {
  private emailSignals = new EmailSignalsService();
  private ipSignals = new IpSignalsService();
  private deviceSignals = new DeviceSignalsService();
  private behaviourSignals = new BehaviourSignalsService();
  private userHistory = new UserHistoryService();
  private velocity = new VelocityService();
  private scoreCalculator = new ScoreCalculator();
  private verdictEngine = new VerdictEngine();
  private linkedAccounts = new LinkedAccountsService();
  private ai = new AiService();

  async assess(request: AssessRequestBody, apiKeyHash: string): Promise<any> {
    const startTime = Date.now();

    // Hash all PII
    const emailHash = request.email ? hashEmail(request.email) : undefined;
    const phoneHash = request.phone ? hashPhone(request.phone) : undefined;
    const deviceFingerprintHash = request.device_fingerprint ? 
      generateFingerprintHash(request.device_fingerprint) : undefined;

    // Run all signal analyses in parallel
    const [
      emailSignalResult,
      ipSignalResult,
      deviceSignalResult,
      behaviourSignalResult,
      userHistoryResult,
      velocityResult
    ] = await Promise.all([
      request.email ? this.emailSignals.analyze(request.email, request.action) : Promise.resolve(undefined),
      request.ip ? this.ipSignals.analyze(request.ip) : Promise.resolve(undefined),
      request.device_fingerprint ? this.deviceSignals.analyze(request.device_fingerprint, apiKeyHash) : Promise.resolve(undefined),
      request.behaviour ? this.behaviourSignals.analyze(request.behaviour) : Promise.resolve(undefined),
      request.user_id ? this.userHistory.analyze(request.user_id, apiKeyHash) : Promise.resolve(undefined),
      this.velocity.getVelocityForAssessment(request, apiKeyHash)
    ]);

    // Calculate trust score
    const { totalScore, riskFactors, positiveFactors } = ScoreCalculator.calculateTotalScore({
      ip: ipSignalResult ? {
        is_vpn: ipSignalResult.is_vpn,
        is_proxy: ipSignalResult.is_proxy,
        is_tor: ipSignalResult.is_tor,
        is_datacenter: ipSignalResult.is_datacenter,
        abuse_score: ipSignalResult.abuse_score,
        velocity_1h: ipSignalResult.velocity_1h,
        velocity_24h: ipSignalResult.velocity_24h,
        is_residential: !ipSignalResult.is_vpn && !ipSignalResult.is_proxy && !ipSignalResult.is_tor && !ipSignalResult.is_datacenter,
        has_clean_reputation: ipSignalResult.abuse_score < 10
      } : undefined,
      email: emailSignalResult ? {
        is_disposable: emailSignalResult.is_disposable,
        has_mx_records: emailSignalResult.has_mx,
        is_free_provider: emailSignalResult.is_free_provider,
        domain_age_days: emailSignalResult.domain_age_days,
        has_random_pattern: emailSignalResult.format_anomalies.length > 0,
        domain_velocity_24h: emailSignalResult.velocity_24h,
        is_corporate: false, // TODO: Implement corporate domain detection
        has_dmarc: emailSignalResult.has_dmarc
      } : undefined,
      device: deviceSignalResult ? {
        is_headless: deviceSignalResult.is_headless,
        has_webdriver: false, // TODO: Implement webdriver detection
        is_automation: deviceSignalResult.is_automation,
        device_age_hours: deviceSignalResult.device_age_days ? deviceSignalResult.device_age_days * 24 : 0,
        unique_users_count: deviceSignalResult.unique_users_on_device,
        linked_to_flagged_account: false, // TODO: Implement flagged account detection
        device_age_days: deviceSignalResult.device_age_days,
        has_single_account: deviceSignalResult.unique_users_on_device === 1
      } : undefined,
      behaviour: behaviourSignalResult ? {
        time_to_complete_seconds: behaviourSignalResult.time_to_complete_seconds,
        mouse_movements: behaviourSignalResult.mouse_movements_detected,
        keyboard_events: behaviourSignalResult.keyboard_events_detected,
        copy_paste_detected: false, // TODO: Implement copy-paste detection
        tab_focus_changes: 0, // TODO: Implement tab focus tracking
        scroll_events: 0 // TODO: Implement scroll event tracking
      } : undefined,
      userHistory: userHistoryResult ? {
        account_age_days: userHistoryResult.account_age_days,
        prior_trust_score: 0, // TODO: Implement prior trust score tracking
        prior_flags: userHistoryResult.prior_flags,
        linked_to_flagged_user: false // TODO: Implement linked flagged user detection
      } : undefined
    }, request.action);

    // Determine verdict
    const { verdict, risk_level } = VerdictEngine.determineVerdict(totalScore, request.action);

    // Get linked accounts
    const linkedAccounts = await this.linkedAccounts.getLinkedAccounts(request, apiKeyHash);

    // Generate explanation
    const explanation = await this.ai.generateExplanation({
      email: request.email,
      ip: request.ip,
      device: request.device_fingerprint,
      action: request.action,
      trustScore: totalScore,
      verdict,
      emailSignalResult,
      ipSignalResult,
      deviceSignalResult,
      behaviourSignalResult,
      userHistoryResult,
      velocityResult
    });

    // Create assessment record
    const assessment = await prisma.assessment.create({
      data: {
        external_user_id: request.user_id,
        developer_api_key_hash: apiKeyHash,
        email_hash: emailHash,
        ip: request.ip,
        device_fingerprint_hash: deviceFingerprintHash,
        action_type: request.action,
        trust_score: totalScore,
        risk_level: risk_level,
        verdict,
        signals: {}, // TODO: populate with signal data
        risk_factors: riskFactors,
        positive_factors: positiveFactors,
        explanation,
        recommended_action: VerdictEngine.generateRecommendation(verdict, totalScore, riskFactors, positiveFactors),
        processing_ms: Date.now() - startTime
      }
    });

    // Update user profile and other records
    await this.updateUserProfile(request, emailHash, phoneHash, deviceFingerprintHash, totalScore, apiKeyHash);

    // Update velocity buckets
    if (request.ip) await this.velocity.updateVelocity('ip', request.ip, apiKeyHash);
    if (request.email) await this.velocity.updateVelocity('email_domain', extractDomain(request.email)!, apiKeyHash);
    if (deviceFingerprintHash) await this.velocity.updateVelocity('device', deviceFingerprintHash, apiKeyHash);

    return {
      assessment_id: assessment.id,
      action: request.action,
      user_id: request.user_id,
      verdict,
      trust_score: totalScore,
      risk_level: risk_level,
      confidence: this.calculateConfidence(request),
      signals: {
        ip: ipSignalResult,
        email: emailSignalResult,
        device: deviceSignalResult,
        behaviour: behaviourSignalResult,
        user_history: userHistoryResult
      },
      risk_factors: riskFactors,
      positive_factors: positiveFactors,
      recommended_action: VerdictEngine.generateRecommendation(verdict, totalScore, riskFactors, positiveFactors),
      challenge_options: VerdictEngine.getChallengeOptions(verdict, totalScore),
      geo_context: {}, // TODO: populate
      linked_accounts: linkedAccounts,
      assessed_at: assessment.createdAt.toISOString()
    };
  }

  private async updateUserProfile(
    request: AssessRequestBody,
    emailHash: string | undefined,
    phoneHash: string | undefined,
    deviceFingerprintHash: string | undefined,
    trustScore: number,
    apiKeyHash: string
  ): Promise<void> {
    if (request.user_id) {
      // Check if user profile exists
      let userProfile = await prisma.userProfile.findFirst({
        where: {
          external_user_id: request.user_id,
          developer_api_key_hash: apiKeyHash
        }
      });

      if (!userProfile) {
        userProfile = await prisma.userProfile.create({
          data: {
            external_user_id: request.user_id,
            email_hash: emailHash,
            phone_hash: phoneHash,
            developer_api_key_hash: apiKeyHash,
            known_ips: request.ip ? [hashIp(request.ip)] : [],
            known_devices: deviceFingerprintHash ? [deviceFingerprintHash] : [],
            trust_score: trustScore
          }
        });
      } else {
        // Update existing profile
        await prisma.userProfile.update({
          where: { id: userProfile.id },
          data: {
            last_seen: new Date(),
            trust_score: trustScore,
            email_hash: emailHash || userProfile.email_hash,
            phone_hash: phoneHash || userProfile.phone_hash,
            known_ips: request.ip ? {
              push: hashIp(request.ip)
            } : undefined,
            known_devices: deviceFingerprintHash ? {
              push: deviceFingerprintHash
            } : undefined
          }
        });
      }
    }
  }

  private calculateConfidence(request: AssessRequestBody): string {
    const signals = [
      !!request.email,
      !!request.ip,
      !!request.device_fingerprint,
      !!request.behaviour,
      !!request.user_id
    ].filter(Boolean).length;

    if (signals >= 4) return 'high';
    if (signals >= 2) return 'medium';
    return 'low';
  }
}