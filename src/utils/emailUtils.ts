export const extractDomain = (email: string): string | null => {
  const match = email.match(/@([^\s]+)$/);
  return match ? match[1].toLowerCase() : null;
};

export const isValidEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isFreeEmailProvider = (domain: string): boolean => {
  const freeProviders = new Set([
    'gmail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de',
    'outlook.com', 'hotmail.com', 'live.com', 'aol.com', 'icloud.com',
    'mail.com', 'gmx.com', 'protonmail.com', 'tutanota.com', 'yandex.com'
  ]);
  return freeProviders.has(domain);
};

export const hasRandomEmailPattern = (email: string): boolean => {
  const localPart = email.split('@')[0];
  
  const randomPatterns = [
    /^[a-z0-9]{8,}$/i,
    /^[a-z]{3,}[0-9]{3,}$/i,
    /^[0-9]{6,}$/
  ];
  
  return randomPatterns.some(pattern => pattern.test(localPart));
};
