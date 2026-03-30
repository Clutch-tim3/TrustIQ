import crypto from 'crypto';

export const sha256 = (str: string): string => {
  return crypto.createHash('sha256').update(str.toLowerCase().trim()).digest('hex');
};

export const hashEmail = (email: string): string => sha256(email);
export const hashPhone = (phone: string): string => sha256(phone);
export const hashIp = (ip: string): string => sha256(ip);
export const hashApiKey = (apiKey: string): string => sha256(apiKey);
