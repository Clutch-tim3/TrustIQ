import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { isValidIp, isDatacenterIp } from '../utils/ipUtils.js';
import { sha256 } from '../utils/hashUtils.js';
import type { IpSignals } from '../types/signals.types.js';

const prisma = new PrismaClient();

export class IpSignalsService {
  async analyze(ip: string): Promise<IpSignals> {
    if (!isValidIp(ip)) {
      return {
        score_contribution: -20,
        is_vpn: false,
        is_proxy: false,
        is_tor: false,
        is_datacenter: false,
        abuse_score: 100,
        velocity_1h: 0,
        velocity_24h: 0,
        velocity_7d: 0
      };
    }

    const [
      reputation,
      ipInfo,
      velocity1h,
      velocity24h,
      velocity7d
    ] = await Promise.all([
      this.getIpReputation(ip),
      this.getIpInfo(ip),
      this.getIpVelocity(ip, '1h'),
      this.getIpVelocity(ip, '24h'),
      this.getIpVelocity(ip, '7d')
    ]);

    const isDatacenter = await isDatacenterIp(ip, ipInfo?.asn, ipInfo?.isp);

    const scoreContribution = this.calculateScore({
      isVpn: reputation?.is_vpn || false,
      isProxy: reputation?.is_proxy || false,
      isTor: reputation?.is_tor || false,
      isDatacenter,
      abuseScore: reputation?.abuse_score || 0,
      velocity1h,
      velocity24h
    });

    return {
      score_contribution: scoreContribution,
      is_vpn: reputation?.is_vpn || false,
      is_proxy: reputation?.is_proxy || false,
      is_tor: reputation?.is_tor || false,
      is_datacenter: isDatacenter,
      country: ipInfo?.country_code,
      abuse_score: reputation?.abuse_score || 0,
      velocity_1h: velocity1h,
      velocity_24h: velocity24h,
      velocity_7d: velocity7d
    };
  }

  private async getIpReputation(ip: string) {
    const cached = await prisma.ipReputation.findUnique({
      where: { ip }
    });

    if (cached && Date.now() - new Date(cached.last_updated).getTime() < 24 * 60 * 60 * 1000) {
      return cached;
    }

    return this.fetchAndCacheIpReputation(ip);
  }

  private async fetchAndCacheIpReputation(ip: string) {
    try {
      const [vpnResponse, abuseResponse] = await Promise.all([
        this.checkVpn(ip),
        this.checkAbuse(ip)
      ]);

      const reputation = await prisma.ipReputation.upsert({
        where: { ip },
        update: {
          is_vpn: vpnResponse.isVpn,
          is_proxy: vpnResponse.isProxy,
          is_tor: vpnResponse.isTor,
          is_datacenter: vpnResponse.isDatacenter,
          is_residential: !vpnResponse.isVpn && !vpnResponse.isProxy && !vpnResponse.isTor && !vpnResponse.isDatacenter,
          country_code: vpnResponse.countryCode,
          region: vpnResponse.region,
          city: vpnResponse.city,
          timezone: vpnResponse.timezone,
          asn: vpnResponse.asn,
          isp: vpnResponse.isp,
          abuse_score: abuseResponse.abuseScore,
          last_updated: new Date()
        },
        create: {
          ip,
          ip_hash: sha256(ip),
          is_vpn: vpnResponse.isVpn,
          is_proxy: vpnResponse.isProxy,
          is_tor: vpnResponse.isTor,
          is_datacenter: vpnResponse.isDatacenter,
          is_residential: !vpnResponse.isVpn && !vpnResponse.isProxy && !vpnResponse.isTor && !vpnResponse.isDatacenter,
          country_code: vpnResponse.countryCode,
          region: vpnResponse.region,
          city: vpnResponse.city,
          timezone: vpnResponse.timezone,
          asn: vpnResponse.asn,
          isp: vpnResponse.isp,
          abuse_score: abuseResponse.abuseScore
        }
      });

      return reputation;
    } catch (error) {
      console.error('Error fetching IP reputation:', error);
      return {
        is_vpn: false,
        is_proxy: false,
        is_tor: false,
        is_datacenter: false,
        abuse_score: 0
      };
    }
  }

  private async checkVpn(ip: string) {
    // TODO: Implement VPN/proxy check using vpnapi.io or similar service
    return {
      isVpn: false,
      isProxy: false,
      isTor: false,
      isDatacenter: false,
      countryCode: 'US',
      region: 'California',
      city: 'San Francisco',
      timezone: 'America/Los_Angeles',
      asn: 'AS12345',
      isp: 'ISP Inc.'
    };
  }

  private async checkAbuse(ip: string) {
    // TODO: Implement abuse score check using AbuseIPDB or similar service
    return {
      abuseScore: 0
    };
  }

  private async getIpInfo(ip: string) {
    // TODO: Implement IP info check using ip-api.com or similar service
    return {
      country_code: 'US',
      country_name: 'United States',
      region: 'California',
      city: 'San Francisco',
      timezone: 'America/Los_Angeles',
      is_eu: false,
      isp: 'ISP Inc.',
      asn: 'AS12345',
      connection_type: 'residential'
    };
  }

  private async getIpVelocity(ip: string, window: string): Promise<number> {
    // TODO: Implement IP velocity check using Redis
    return 0;
  }

  private calculateScore(params: {
    isVpn: boolean;
    isProxy: boolean;
    isTor: boolean;
    isDatacenter: boolean;
    abuseScore: number;
    velocity1h: number;
    velocity24h: number;
  }): number {
    let score = 0;

    if (params.isVpn) score -= 8;
    if (params.isProxy) score -= 12;
    if (params.isTor) score -= 20;
    if (params.isDatacenter) score -= 10;
    if (params.abuseScore > 50) score -= 15;
    if (params.velocity1h > 50) score -= 20;
    else if (params.velocity1h > 10) score -= 10;
    if (!params.isVpn && !params.isProxy && !params.isTor && !params.isDatacenter && params.abuseScore < 10) score += 5;

    return score;
  }
}