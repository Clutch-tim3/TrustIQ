export interface LinkedAccount {
  user_id: string;
  link_type: string;
  confidence: string;
  risk_score: number;
}

export interface UserProfileResponse {
  user_id: string;
  trust_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  account_age_days: number;
  first_seen: string;
  last_seen: string;
  total_assessments: number;
  flagged_count: number;
  known_devices: Array<{
    device_id: string;
    device_type: string;
    browser: string;
    first_seen: string;
    last_seen: string;
    is_primary: boolean;
  }>;
  known_locations: Array<{
    country: string;
    city?: string;
    frequency_pct: number;
  }>;
  behaviour_patterns: {
    typical_login_hours?: string;
    avg_sessions_per_week?: number;
    avg_session_duration_mins?: number;
  };
  linked_accounts: LinkedAccount[];
  risk_history: Array<{
    date: string;
    event: string;
    score: number;
  }>;
}

export interface VelocityCheckResponse {
  entity_type: 'ip' | 'email_domain' | 'device';
  entity: string;
  velocity: {
    [window: string]: {
      count: number;
      threshold: number;
      is_anomalous: boolean;
    };
  };
  is_anomalous: boolean;
  anomaly_score: number;
  recommendation: string;
}

export interface Anomaly {
  anomaly_id: string;
  type: 'bot_wave' | 'velocity_spike' | 'geographic_anomaly' | 'credential_stuffing';
  severity: 'critical' | 'high' | 'medium';
  detected_at: string;
  title: string;
  description: string;
  affected_count: number;
  signals: {
    ip_range?: string;
    email_pattern?: string;
    device_pattern?: string;
    time_window_minutes?: number;
  };
  auto_blocked: boolean;
  recommended_action: string;
}

export interface AnomaliesResponse {
  period: string;
  total_anomalies: number;
  anomalies: Anomaly[];
  summary: {
    blocked_automatically: number;
    flagged_for_review: number;
    clean_signups: number;
  };
}

export interface PhoneAssessResponse {
  phone: string;
  is_valid: boolean;
  formatted_e164: string;
  risk_score: number;
  risk_label: 'Low Risk' | 'Medium Risk' | 'High Risk';
  verdict: 'allow' | 'challenge' | 'block';
  signals: {
    line_type: 'mobile' | 'landline' | 'voip' | 'toll_free' | 'unknown';
    carrier?: string;
    country_code: string;
    is_voip: boolean;
    is_prepaid: boolean;
    is_ported: boolean;
    is_virtual_number: boolean;
    is_known_fraud_number: boolean;
    velocity_24h: number;
  };
  risk_factors: string[];
  recommendation: string;
}

export interface IdentityCheckResponse {
  consistency_score: number;
  is_consistent: boolean;
  verdict: 'allow' | 'challenge' | 'block';
  checks: {
    name_email_consistent: boolean;
    country_signals_consistent: boolean;
    name_is_plausible: boolean;
    company_email_consistent: boolean;
    age_plausible: boolean;
  };
  inconsistencies: string[];
  risk_factors: string[];
  recommendation: string;
}

export interface StatsResponse {
  period: string;
  assessments: {
    total: number;
    allow: number;
    challenge: number;
    block: number;
    allow_pct: number;
    challenge_pct: number;
    block_pct: number;
  };
  threats_blocked: {
    bot_signups: number;
    disposable_emails: number;
    vpn_proxy_logins: number;
    fraud_ip_attempts: number;
    suspicious_devices: number;
  };
  trust_distribution: {
    trusted_80_plus: number;
    low_risk_61_80: number;
    medium_risk_40_60: number;
    high_risk_below_40: number;
  };
  top_threat_countries: string[];
  bot_wave_incidents: number;
}
