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

export interface BehaviourData {
  time_to_complete_seconds: number;
  mouse_movements: boolean;
  keyboard_events: boolean;
  copy_paste_detected: boolean;
  tab_focus_changes: number;
  scroll_events: number;
}

export interface ContextData {
  app_name?: string;
  environment?: string;
  referrer?: string;
  utm_source?: string;
  locale?: string;
  custom_signals?: Record<string, any>;
}

export interface AssessRequestBody {
  action: string;
  user_id?: string;
  email?: string;
  phone?: string;
  ip?: string;
  device_fingerprint?: DeviceFingerprint;
  behaviour?: BehaviourData;
  context?: ContextData;
}

export interface EmailAssessRequestBody {
  email: string;
  context: 'signup' | 'login' | 'contact_form' | 'general';
}

export interface IpAssessRequestBody {
  ip: string;
  context: 'signup' | 'login' | 'payment' | 'general';
}

export interface DeviceAssessRequestBody {
  device_fingerprint: DeviceFingerprint;
  user_id?: string;
  ip?: string;
}

export interface PhoneAssessRequestBody {
  phone: string;
  context: 'signup' | '2fa_setup' | 'payment' | 'general';
}

export interface IdentityAssessRequestBody {
  name: string;
  email: string;
  phone: string;
  country: string;
  ip: string;
  date_of_birth?: string;
  company?: string;
}

export interface BatchAssessRequestBody {
  assessments: Array<{
    user_id?: string;
    email?: string;
    ip?: string;
    action: string;
  }>;
  webhook_url?: string;
}

export interface TrackEventRequestBody {
  user_id: string;
  event: string;
  ip?: string;
  device_fingerprint_hash?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface ReportEventRequestBody {
  user_id: string;
  report_type: 'fraud' | 'fake_account' | 'chargeback' | 'spam' | 'tos_violation' | 'bot' | 'identity_theft';
  confirmed: boolean;
  details: string;
  email?: string;
  ip?: string;
  device_fingerprint_hash?: string;
}

export interface UpdateTrustScoreRequestBody {
  adjustment: 'increase' | 'decrease' | 'set';
  value: number;
  reason: 'manual_review_cleared' | 'fraud_confirmed' | 'identity_verified' | 'chargeback_received';
  notes?: string;
}

export interface ConfigThresholdsRequestBody {
  thresholds: {
    allow: number;
    challenge: number;
    block: number;
  };
  action_overrides?: Record<string, {
    allow: number;
    challenge: number;
    block: number;
  }>;
}
