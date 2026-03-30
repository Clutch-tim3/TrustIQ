import { PrismaClient } from '@prisma/client';
import dnsPromises from 'node:dns/promises';
import { sha256, hashEmail } from '../utils/hashUtils.js';
import { extractDomain, isValidEmailFormat, isFreeEmailProvider, hasRandomEmailPattern } from '../utils/emailUtils.js';
import type { EmailSignals } from '../types/signals.types.js';

const prisma = new PrismaClient();

export class EmailSignalsService {
  async analyze(email: string, context: string): Promise<EmailSignals> {
    if (!isValidEmailFormat(email)) {
      return {
        score_contribution: -20,
        is_disposable: false,
        is_free_provider: false,
        has_mx: false,
        has_dmarc: false,
        velocity_24h: 0,
        format_anomalies: ['Invalid email format']
      };
    }

    const domain = extractDomain(email);
    if (!domain) {
      return {
        score_contribution: -20,
        is_disposable: false,
        is_free_provider: false,
        has_mx: false,
        has_dmarc: false,
        velocity_24h: 0,
        format_anomalies: ['Invalid email domain']
      };
    }

    const [
      isDisposable,
      hasMx,
      hasDmarc,
      domainAge,
      domainVelocity,
      isCorporate
    ] = await Promise.all([
      this.isDisposableDomain(domain),
      this.hasMxRecords(domain),
      this.hasDmarcRecords(domain),
      this.getDomainAge(domain),
      this.getDomainVelocity(domain),
      this.isCorporateDomain(domain)
    ]);

    const isFree = isFreeEmailProvider(domain);
    const hasRandomPattern = hasRandomEmailPattern(email);

    const scoreContribution = this.calculateScore({
      isDisposable,
      hasMx,
      hasDmarc,
      isFree,
      isCorporate,
      domainAge,
      domainVelocity,
      hasRandomPattern,
      context
    });

    const formatAnomalies = [];
    if (hasRandomPattern) formatAnomalies.push('Random character pattern detected');

    return {
      score_contribution: scoreContribution,
      is_disposable: isDisposable,
      is_free_provider: isFree,
      has_mx: hasMx,
      has_dmarc: hasDmarc,
      domain_age_days: domainAge,
      velocity_24h: domainVelocity,
      format_anomalies: formatAnomalies
    };
  }

  private async isDisposableDomain(domain: string): Promise<boolean> {
    const disposableDomain = await prisma.disposableEmailDomain.findFirst({
      where: { domain }
    });
    return !!disposableDomain;
  }

  private async hasMxRecords(domain: string): Promise<boolean> {
    try {
      const mxRecords = await dnsPromises.resolveMx(domain);
      return mxRecords.length > 0;
    } catch {
      return false;
    }
  }

  private async hasDmarcRecords(domain: string): Promise<boolean> {
    try {
      const txtRecords = await dnsPromises.resolveTxt(`_dmarc.${domain}`);
      return txtRecords.some((record: string[]) => record[0].includes('DMARC'));
    } catch {
      return false;
    }
  }

  private async getDomainAge(domain: string): Promise<number | undefined> {
    try {
      // TODO: Implement domain age check using WHOIS or similar service
      return undefined;
    } catch {
      return undefined;
    }
  }

  private async getDomainVelocity(domain: string): Promise<number> {
    // TODO: Implement domain velocity check using Redis or database
    return 0;
  }

  private isCorporateDomain(domain: string): boolean {
    const corporatePatterns = [
      /\.com$/, /\.net$/, /\.org$/, /\.biz$/, /\.info$/,
      /\.co\./, /\.tech$/, /\.io$/, /\.ai$/, /\.dev$/
    ];
    const freeProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com'];
    
    return !freeProviders.includes(domain) && corporatePatterns.some(pattern => pattern.test(domain));
  }

  private calculateScore(params: {
    isDisposable: boolean;
    hasMx: boolean;
    hasDmarc: boolean;
    isFree: boolean;
    isCorporate: boolean;
    domainAge?: number;
    domainVelocity: number;
    hasRandomPattern: boolean;
    context: string;
  }): number {
    let score = 0;

    if (params.isDisposable) score -= 15;
    if (!params.hasMx) score -= 20;
    if (params.isFree && (params.context === 'business' || params.context.includes('payment'))) score -= 5;
    if (params.domainAge && params.domainAge < 30) score -= 10;
    if (params.hasRandomPattern) score -= 8;
    if (params.domainVelocity > 20) score -= 8;
    if (params.isCorporate && params.hasDmarc) score += 10;
    if (params.domainAge && params.domainAge > 1825) score += 5;

    return score;
  }
}