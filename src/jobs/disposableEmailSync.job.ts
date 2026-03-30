import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export class DisposableEmailSyncJob {
  async run(): Promise<void> {
    try {
      console.log('Starting disposable email domain sync...');
      
      // Fetch disposable domains from multiple sources
      const [source1Domains, source2Domains] = await Promise.all([
        this.fetchFromSource1(),
        this.fetchFromSource2()
      ]);
      
      const allDomains = new Set([...source1Domains, ...source2Domains]);
      
      // Remove old domains
      await prisma.disposableEmailDomain.deleteMany({
        where: {
          domain: {
            notIn: Array.from(allDomains)
          }
        }
      });
      
      // Add new domains
      const existingDomains = await prisma.disposableEmailDomain.findMany({
        select: { domain: true }
      });
      
      const existingDomainSet = new Set(existingDomains.map(d => d.domain));
      const newDomains = Array.from(allDomains).filter(domain => !existingDomainSet.has(domain));
      
      if (newDomains.length > 0) {
        await prisma.disposableEmailDomain.createMany({
          data: newDomains.map(domain => ({
            domain,
            source: 'github.com/disposable-email-domains'
          }))
        });
      }
      
      console.log(`Sync completed. ${allDomains.size} domains in database. ${newDomains.length} new domains added.`);
    } catch (error) {
      console.error('Disposable email sync failed:', error);
    }
  }

  private async fetchFromSource1(): Promise<string[]> {
    try {
      const response = await axios.get('https://github.com/disposable-email-domains/disposable-email-domains/raw/master/disposable_email_blocklist.conf');
      const content = response.data;
      return content.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0 && !line.startsWith('#'));
    } catch (error) {
      console.error('Failed to fetch from source 1:', error);
      return [];
    }
  }

  private async fetchFromSource2(): Promise<string[]> {
    try {
      const response = await axios.get('https://github.com/ivolo/disposable-email-domains/raw/master/index.json');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch from source 2:', error);
      return [];
    }
  }
}