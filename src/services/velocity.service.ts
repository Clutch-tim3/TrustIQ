import { redisClient, isRedisAvailable } from '../config/redis.js';
import { sha256 } from '../utils/hashUtils.js';
import { extractDomain } from '../utils/emailUtils.js';
import { generateFingerprintHash } from '../utils/fingerprintHash.js';
import type { AssessRequestBody } from '../types/assessment.types.js';

export class VelocityService {
  async getVelocityForAssessment(request: AssessRequestBody, apiKeyHash: string) {
    const [ipVelocity, emailVelocity, deviceVelocity] = await Promise.all([
      request.ip               ? this.getIpVelocity(request.ip, apiKeyHash)                       : Promise.resolve(null),
      request.email            ? this.getEmailVelocity(request.email, apiKeyHash)                 : Promise.resolve(null),
      request.device_fingerprint ? this.getDeviceVelocity(request.device_fingerprint, apiKeyHash) : Promise.resolve(null),
    ]);
    return { ip: ipVelocity, email: emailVelocity, device: deviceVelocity };
  }

  async getIpVelocity(ip: string, apiKeyHash: string): Promise<{ [key: string]: number }> {
    const ipHash = sha256(ip);
    const [v1h, v24h, v7d] = await Promise.all([
      this.getVelocity('ip', ipHash, apiKeyHash, '1h'),
      this.getVelocity('ip', ipHash, apiKeyHash, '24h'),
      this.getVelocity('ip', ipHash, apiKeyHash, '7d'),
    ]);
    return { '1h': v1h, '24h': v24h, '7d': v7d };
  }

  async getEmailVelocity(email: string, apiKeyHash: string): Promise<{ [key: string]: number }> {
    const domain = extractDomain(email);
    if (!domain) return {};
    const domainHash = sha256(domain);
    const [v1h, v24h, v7d] = await Promise.all([
      this.getVelocity('email_domain', domainHash, apiKeyHash, '1h'),
      this.getVelocity('email_domain', domainHash, apiKeyHash, '24h'),
      this.getVelocity('email_domain', domainHash, apiKeyHash, '7d'),
    ]);
    return { '1h': v1h, '24h': v24h, '7d': v7d };
  }

  async getDeviceVelocity(fingerprint: any, apiKeyHash: string): Promise<{ [key: string]: number }> {
    const deviceHash = generateFingerprintHash(fingerprint);
    const [v1h, v24h, v7d] = await Promise.all([
      this.getVelocity('device', deviceHash, apiKeyHash, '1h'),
      this.getVelocity('device', deviceHash, apiKeyHash, '24h'),
      this.getVelocity('device', deviceHash, apiKeyHash, '7d'),
    ]);
    return { '1h': v1h, '24h': v24h, '7d': v7d };
  }

  private async getVelocity(entityType: string, entityHash: string, apiKeyHash: string, window: string): Promise<number> {
    if (!isRedisAvailable() || !redisClient) return 0;
    try {
      const key   = this.getVelocityKey(entityType, entityHash, apiKeyHash, window);
      const count = await redisClient.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch {
      return 0;
    }
  }

  async updateVelocity(entityType: string, entityValue: string, apiKeyHash: string): Promise<void> {
    if (!isRedisAvailable() || !redisClient) return;
    const entityHash = this.getEntityHash(entityType, entityValue);
    const windows    = ['1m', '5m', '1h', '24h', '7d'];
    await Promise.all(
      windows.map(async (window) => {
        try {
          const key = this.getVelocityKey(entityType, entityHash, apiKeyHash, window);
          await redisClient!.incr(key);
          await redisClient!.expire(key, this.getWindowTtl(window));
        } catch { /* ignore */ }
      })
    );
  }

  private getEntityHash(entityType: string, entityValue: string): string {
    switch (entityType) {
      case 'ip':
      case 'email_domain': return sha256(entityValue);
      case 'device':       return entityValue;
      default: throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private getVelocityKey(entityType: string, entityHash: string, apiKeyHash: string, window: string): string {
    return `trustiq:vel:${apiKeyHash}:${entityType}:${entityHash}:${window}`;
  }

  private getWindowTtl(window: string): number {
    switch (window) {
      case '1m':  return 60;
      case '5m':  return 300;
      case '1h':  return 3600;
      case '24h': return 86400;
      case '7d':  return 604800;
      default: throw new Error(`Unknown window size: ${window}`);
    }
  }

  async checkVelocity(entityType: string, entityValue: string, apiKeyHash: string): Promise<{ [key: string]: { count: number; threshold: number; is_anomalous: boolean } }> {
    const entityHash = this.getEntityHash(entityType, entityValue);
    const thresholds = this.getVelocityThresholds(entityType);
    const results: any = {};

    for (const [window, threshold] of Object.entries(thresholds)) {
      const count = await this.getVelocity(entityType, entityHash, apiKeyHash, window);
      results[window] = { count, threshold, is_anomalous: count > threshold };
    }
    return results;
  }

  private getVelocityThresholds(entityType: string): { [key: string]: number } {
    const defaults = { '1h': 30, '24h': 100, '7d': 500 };
    switch (entityType) {
      case 'ip':           return { ...defaults };
      case 'email_domain': return { ...defaults, '1h': 20, '24h': 50 };
      case 'device':       return { ...defaults, '1h': 10, '24h': 30 };
      default:             return defaults;
    }
  }
}
