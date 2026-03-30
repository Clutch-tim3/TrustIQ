import { PrismaClient } from '@prisma/client';
import { generateFingerprintHash, analyzeDeviceSignals } from '../utils/fingerprintHash.js';
import type { DeviceSignals } from '../types/signals.types.js';
import type { DeviceFingerprint } from '../types/assessment.types.js';

const prisma = new PrismaClient();

export class DeviceSignalsService {
  async analyze(fingerprint: DeviceFingerprint, apiKeyHash: string): Promise<DeviceSignals> {
    const deviceHash = generateFingerprintHash(fingerprint);
    const deviceAssessment = await this.getOrCreateDevice(fingerprint, deviceHash, apiKeyHash);

    const scoreContribution = this.calculateScore({
      isHeadless: deviceAssessment.is_headless,
      hasWebdriver: deviceAssessment.has_webdriver,
      isAutomation: deviceAssessment.is_automation,
      deviceAgeDays: deviceAssessment.device_age_days,
      uniqueUsers: deviceAssessment.unique_users_count,
      linkedToFlagged: deviceAssessment.linked_to_flagged_account,
      hasSingleAccount: deviceAssessment.unique_users_count === 1
    });

    return {
      score_contribution: scoreContribution,
      fingerprint_hash: deviceHash,
      is_headless: deviceAssessment.is_headless,
      is_automation: deviceAssessment.is_automation,
      device_age_days: deviceAssessment.device_age_days,
      unique_users_on_device: deviceAssessment.unique_users_count,
      previously_seen: deviceAssessment.previously_seen
    };
  }

  private async getOrCreateDevice(
    fingerprint: DeviceFingerprint,
    deviceHash: string,
    apiKeyHash: string
  ) {
    const existingDevice = await prisma.deviceFingerprint.findFirst({
      where: { fingerprint_hash: deviceHash }
    });

    if (existingDevice) {
      return this.updateExistingDevice(existingDevice, apiKeyHash);
    }

    return this.createNewDevice(fingerprint, deviceHash, apiKeyHash);
  }

  private async updateExistingDevice(existingDevice: any, apiKeyHash: string) {
    const updated = await prisma.deviceFingerprint.update({
      where: { id: existingDevice.id },
      data: {
        last_seen: new Date(),
        unique_users_count: { increment: 1 }
      }
    });

    return {
      ...updated,
      device_age_days: Math.floor((Date.now() - new Date(updated.first_seen).getTime()) / (1000 * 60 * 60 * 24)),
      linked_to_flagged_account: updated.linked_user_ids.some((userId: string) => this.isFlaggedUser(userId)),
      previously_seen: true
    };
  }

  private async createNewDevice(
    fingerprint: DeviceFingerprint,
    deviceHash: string,
    apiKeyHash: string
  ) {
    const deviceSignals = analyzeDeviceSignals(fingerprint);
    
    const newDevice = await prisma.deviceFingerprint.create({
      data: {
        fingerprint_hash: deviceHash,
        browser: this.extractBrowser(fingerprint.user_agent),
        browser_version: this.extractBrowserVersion(fingerprint.user_agent),
        os: this.extractOs(fingerprint.user_agent),
        os_version: this.extractOsVersion(fingerprint.user_agent),
        device_type: deviceSignals.device_type,
        screen_resolution: fingerprint.screen_resolution,
        timezone: fingerprint.timezone,
        language: fingerprint.language,
        is_headless: deviceSignals.is_headless,
        is_automation: deviceSignals.is_automation,
        has_webdriver: deviceSignals.has_webdriver,
        has_adblock: false,
        unique_users_count: 1,
        risk_score: 0,
        fraud_reports: 0
      }
    });

    return {
      ...newDevice,
      device_age_days: 0,
      linked_to_flagged_account: false,
      previously_seen: false
    };
  }

  private extractBrowser(userAgent: string): string | undefined {
    const browserPatterns = [
      { name: 'Chrome', pattern: /Chrome\/([\d.]+)/ },
      { name: 'Firefox', pattern: /Firefox\/([\d.]+)/ },
      { name: 'Safari', pattern: /Safari\/([\d.]+)/ },
      { name: 'Edge', pattern: /Edg\/([\d.]+)/ },
      { name: 'Opera', pattern: /OPR\/([\d.]+)/ }
    ];

    for (const browser of browserPatterns) {
      const match = userAgent.match(browser.pattern);
      if (match) return browser.name;
    }

    return undefined;
  }

  private extractBrowserVersion(userAgent: string): string | undefined {
    const browserPatterns = [
      { pattern: /Chrome\/([\d.]+)/ },
      { pattern: /Firefox\/([\d.]+)/ },
      { pattern: /Safari\/([\d.]+)/ },
      { pattern: /Edg\/([\d.]+)/ },
      { pattern: /OPR\/([\d.]+)/ }
    ];

    for (const browser of browserPatterns) {
      const match = userAgent.match(browser.pattern);
      if (match) return match[1];
    }

    return undefined;
  }

  private extractOs(userAgent: string): string | undefined {
    const osPatterns = [
      { name: 'Windows', pattern: /Windows NT ([\d.]+)/ },
      { name: 'macOS', pattern: /Mac OS X ([\d._]+)/ },
      { name: 'Linux', pattern: /Linux/ },
      { name: 'iOS', pattern: /iPhone OS ([\d._]+)/ },
      { name: 'Android', pattern: /Android ([\d.]+)/ }
    ];

    for (const os of osPatterns) {
      const match = userAgent.match(os.pattern);
      if (match) return os.name;
    }

    return undefined;
  }

  private extractOsVersion(userAgent: string): string | undefined {
    const osPatterns = [
      { pattern: /Windows NT ([\d.]+)/ },
      { pattern: /Mac OS X ([\d._]+)/ },
      { pattern: /iPhone OS ([\d._]+)/ },
      { pattern: /Android ([\d.]+)/ }
    ];

    for (const os of osPatterns) {
      const match = userAgent.match(os.pattern);
      if (match) return match[1];
    }

    return undefined;
  }

  private isFlaggedUser(userId: string): boolean {
    // TODO: Implement flagged user check
    return false;
  }

  private calculateScore(params: {
    isHeadless: boolean;
    hasWebdriver: boolean;
    isAutomation: boolean;
    deviceAgeDays: number;
    uniqueUsers: number;
    linkedToFlagged: boolean;
    hasSingleAccount: boolean;
  }): number {
    let score = 0;

    if (params.isHeadless) score -= 15;
    if (params.hasWebdriver) score -= 20;
    if (params.isAutomation) score -= 20;
    if (params.deviceAgeDays < 1) score -= 5;
    if (params.uniqueUsers >= 5) score -= 10;
    if (params.linkedToFlagged) score -= 15;
    if (params.deviceAgeDays > 30) score += 10;
    if (params.hasSingleAccount) score += 5;

    return score;
  }
}