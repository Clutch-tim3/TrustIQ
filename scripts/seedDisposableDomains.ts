import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import prisma from '../src/config/database.js';

const DISPOSABLE_DOMAINS_URL = 'https://github.com/disposable-email-domains/disposable-email-domains/raw/master/domains.txt';

async function seedDisposableDomains() {
  console.log('🌱 Starting to seed disposable email domains...');

  try {
    const response = await fetch(DISPOSABLE_DOMAINS_URL);
    const text = await response.text();
    const domains = text.split('\n').filter(domain => domain.trim().length > 0);

    console.log(`📥 Found ${domains.length} disposable domains`);

    const existingCount = await prisma.disposableEmailDomain.count();
    console.log(`ℹ️ Already have ${existingCount} disposable domains in database`);

    const newDomains = [];
    for (const domain of domains) {
      const trimmed = domain.trim().toLowerCase();
      if (trimmed) {
        newDomains.push({
          domain: trimmed,
          source: 'disposable-email-domains'
        });
      }
    }

    if (newDomains.length > 0) {
      console.log(`➕ Adding ${newDomains.length} new disposable domains`);
      
      await prisma.disposableEmailDomain.createMany({
        data: newDomains,
        skipDuplicates: true
      });

      const finalCount = await prisma.disposableEmailDomain.count();
      console.log(`✅ Done. Database now has ${finalCount} disposable domains`);
    } else {
      console.log('✅ No new domains to add');
    }

  } catch (error) {
    console.error('❌ Error seeding disposable domains:', error);
  }

  await prisma.$disconnect();
}

seedDisposableDomains();
