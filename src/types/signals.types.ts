export interface IpSignals {
  score_contribution: number;
  is_vpn: boolean;
  is_proxy: boolean;
  is_tor: boolean;
  is_datacenter: boolean;
  country?: string;
  abuse_score: number;
  velocity_1h: number;
  velocity_24h: number;
  velocity_7d: number;
}

export interface EmailSignals {
  score_contribution: number;
  is_disposable: boolean;
  is_free_provider: boolean;
  has_mx: boolean;
  has_dmarc: boolean;
  domain_age_days?: number;
  velocity_24h: number;
  format_anomalies: string[];
}

export interface DeviceSignals {
  score_contribution: number;
  fingerprint_hash: string;
  is_headless: boolean;
  is_automation: boolean;
  device_age_days?: number;
  unique_users_on_device: number;
  previously_seen: boolean;
}

export interface BehaviourSignals {
  score_contribution: number;
  time_to_complete_seconds: number;
  human_timing: boolean;
  mouse_movements_detected: boolean;
  keyboard_events_detected: boolean;
}

export interface UserHistorySignals {
  score_contribution: number;
  account_age_days?: number;
  prior_assessments: number;
  prior_flags: number;
}

export interface GeoContext {
  ip_country?: string;
  email_domain_country?: string;
  country_match: boolean;
  timezone?: string;
}

export interface ChallengeOptions {
  recommended: 'email_otp' | 'sms_otp' | 'captcha';
  alternatives: Array<'email_otp' | 'sms_otp' | 'captcha'>;
}

export interface LinkedAccount {
  user_id: string;
  link_type: 'shared_device' | 'shared_ip' | 'shared_email_pattern';
  device_id?: string;
  ip?: string;
  confidence: 'high' | 'medium' | 'low';
  first_link_detected: string;
  risk_implication?: string;
}

export interface AssessResponseData {
  assessment_id: string;
  action: string;
  user_id?: string;
  verdict: 'allow' | 'challenge' | 'block' | 'manual_review';
  trust_score: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  signals: {
    ip?: IpSignals;
    email?: EmailSignals;
    device?: DeviceSignals;
    behaviour?: BehaviourSignals;
    user_history?: UserHistorySignals;
  };
  risk_factors: string[];
  positive_factors: string[];
  recommended_action: string;
  challenge_options?: ChallengeOptions;
  geo_context?: GeoContext;
  linked_accounts: LinkedAccount[];
  assessed_at: string;
}
