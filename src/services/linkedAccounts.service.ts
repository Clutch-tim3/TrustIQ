import { PrismaClient } from '@prisma/client';
import { sha256 } from '../utils/hashUtils.js';
import { extractDomain } from '../utils/emailUtils.js';
import { generateFingerprintHash } from '../utils/fingerprintHash.js';
import type { LinkedAccount } from '../types/signals.types.js';
import type { AssessRequestBody } from '../types/assessment.types.js';

const prisma = new PrismaClient();

export class LinkedAccountsService {
  async getLinkedAccounts(request: AssessRequestBody, apiKeyHash: string): Promise<LinkedAccount[]> {
    const linkedAccounts: LinkedAccount[] = [];
    
    if (request.user_id) {
      // Get all linked accounts from user profile
      const userProfile = await prisma.userProfile.findFirst({
        where: {
          external_user_id: request.user_id,
          developer_api_key_hash: apiKeyHash
        }
      });
      
      if (userProfile?.linked_user_ids) {
        for (const linkedUserId of userProfile.linked_user_ids) {
          linkedAccounts.push({
            user_id: linkedUserId,
            link_type: 'shared_email_pattern',
            confidence: 'medium',
            first_link_detected: new Date().toISOString().split('T')[0]
          });
        }
      }
    }
    
    if (request.ip) {
      // Find other users who have used this IP
      const ipHash = sha256(request.ip);
      const usersWithSameIp = await prisma.userProfile.findMany({
        where: {
          developer_api_key_hash: apiKeyHash,
          external_user_id: { not: request.user_id },
          known_ips: { has: ipHash }
        }
      });
      
      for (const user of usersWithSameIp) {
        linkedAccounts.push({
          user_id: user.external_user_id!,
          link_type: 'shared_ip',
          ip: request.ip,
          confidence: 'high',
          first_link_detected: new Date().toISOString().split('T')[0]
        });
      }
    }
    
    if (request.device_fingerprint) {
      // Find other users who have used this device
      const deviceHash = generateFingerprintHash(request.device_fingerprint);
      const usersWithSameDevice = await prisma.userProfile.findMany({
        where: {
          developer_api_key_hash: apiKeyHash,
          external_user_id: { not: request.user_id },
          known_devices: { has: deviceHash }
        }
      });
      
      for (const user of usersWithSameDevice) {
        linkedAccounts.push({
          user_id: user.external_user_id!,
          link_type: 'shared_device',
          device_id: deviceHash,
          confidence: 'high',
          first_link_detected: new Date().toISOString().split('T')[0]
        });
      }
    }
    
    if (request.email) {
      // Find other users with the same email domain
      const domain = extractDomain(request.email);
      const emailHash = sha256(request.email);
      
      const usersWithSameDomain = await prisma.userProfile.findMany({
        where: {
          developer_api_key_hash: apiKeyHash,
          external_user_id: { not: request.user_id },
          email_hash: { not: emailHash },
          // TODO: Check if we have domain information
        }
      });
      
      for (const user of usersWithSameDomain) {
        linkedAccounts.push({
          user_id: user.external_user_id!,
          link_type: 'shared_email_pattern',
          confidence: 'medium',
          first_link_detected: new Date().toISOString().split('T')[0]
        });
      }
    }
    
    return linkedAccounts;
  }
}