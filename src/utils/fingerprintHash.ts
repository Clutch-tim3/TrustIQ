import crypto from 'crypto';

export interface DeviceFingerprint {
  user_agent: string;
  screen_resolution: string;
  timezone: string;
  language: string;
  platform: string;
  cookie_enabled: boolean;
  canvas_hash?: string;
  webgl_hash?: string;
  audio_hash?: string;
  installed_fonts_count: number;
  do_not_track: boolean;
  hardware_concurrency: number;
  device_memory_gb: number;
  connection_type: string;
  has_webdriver: boolean;
  has_phantom: boolean;
  has_nightmare: boolean;
  plugins_count: number;
}

export const generateFingerprintHash = (fingerprint: DeviceFingerprint): string => {
  const components = [
    fingerprint.user_agent,
    fingerprint.screen_resolution,
    fingerprint.timezone,
    fingerprint.language,
    fingerprint.platform,
    fingerprint.cookie_enabled ? 'cookie:enabled' : 'cookie:disabled',
    fingerprint.canvas_hash || 'canvas:missing',
    fingerprint.webgl_hash || 'webgl:missing',
    fingerprint.audio_hash || 'audio:missing',
    `fonts:${fingerprint.installed_fonts_count}`,
    fingerprint.do_not_track ? 'dnt:yes' : 'dnt:no',
    `cores:${fingerprint.hardware_concurrency}`,
    `memory:${fingerprint.device_memory_gb}GB`,
    fingerprint.connection_type,
    fingerprint.has_webdriver ? 'webdriver:yes' : 'webdriver:no',
    fingerprint.has_phantom ? 'phantom:yes' : 'phantom:no',
    fingerprint.has_nightmare ? 'nightmare:yes' : 'nightmare:no',
    `plugins:${fingerprint.plugins_count}`
  ];

  const raw = components.join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
};

export const analyzeDeviceSignals = (fingerprint: DeviceFingerprint): {
  is_headless: boolean;
  is_automation: boolean;
  has_webdriver: boolean;
  device_type: string;
} => {
  const userAgent = fingerprint.user_agent.toLowerCase();
  
  const isHeadless = userAgent.includes('headless') || 
    (!userAgent.includes('mozilla') && !userAgent.includes('chrome') && !userAgent.includes('safari'));
  
  const isAutomation = fingerprint.has_webdriver || 
    fingerprint.has_phantom || 
    fingerprint.has_nightmare || 
    userAgent.includes('selenium') || 
    userAgent.includes('webdriver');

  const hasWebdriver = fingerprint.has_webdriver;

  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipad|ipod|tablet/i.test(userAgent)) {
    if (/tablet/i.test(userAgent) || fingerprint.screen_resolution.includes('1024x')) {
      deviceType = 'tablet';
    } else {
      deviceType = 'mobile';
    }
  }

  return {
    is_headless: isHeadless,
    is_automation: isAutomation,
    has_webdriver: hasWebdriver,
    device_type: deviceType
  };
};
