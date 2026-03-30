import { ScoreCalculator } from '../src/services/scoreCalculator.service';

describe('ScoreCalculator', () => {
  describe('calculateTotalScore', () => {
    it('should calculate total score with all signals', () => {
      const result = ScoreCalculator.calculateTotalScore({
        ip: {
          is_vpn: false,
          is_proxy: false,
          is_tor: false,
          is_datacenter: false,
          abuse_score: 10,
          velocity_1h: 5,
          velocity_24h: 15,
          is_residential: true,
          has_clean_reputation: true
        },
        email: {
          is_disposable: false,
          has_mx_records: true,
          is_free_provider: false,
          domain_age_days: 365 * 5,
          has_random_pattern: false,
          domain_velocity_24h: 5,
          is_corporate: true,
          has_dmarc: true
        },
        device: {
          is_headless: false,
          has_webdriver: false,
          is_automation: false,
          device_age_hours: 24,
          unique_users_count: 1,
          linked_to_flagged_account: false,
          device_age_days: 30,
          has_single_account: true
        },
        behaviour: {
          time_to_complete_seconds: 45,
          mouse_movements: true,
          keyboard_events: true,
          copy_paste_detected: false,
          tab_focus_changes: 2,
          scroll_events: 8
        },
        userHistory: {
          account_age_days: 365,
          prior_trust_score: 85,
          prior_flags: 0,
          linked_to_flagged_user: false
        }
      }, 'payment');

      expect(result.totalScore).toBeGreaterThan(80);
      expect(result.weights.ip?.score).toBeGreaterThan(0);
      expect(result.weights.email?.score).toBeGreaterThan(0);
      expect(result.weights.device?.score).toBeGreaterThan(0);
      expect(result.weights.behaviour?.score).toBeGreaterThan(0);
      expect(result.weights.userHistory?.score).toBeGreaterThan(0);
    });

    it('should calculate total score with negative signals', () => {
      const result = ScoreCalculator.calculateTotalScore({
        ip: {
          is_vpn: true,
          is_proxy: true,
          is_tor: false,
          is_datacenter: true,
          abuse_score: 85,
          velocity_1h: 60,
          velocity_24h: 200,
          is_residential: false,
          has_clean_reputation: false
        },
        email: {
          is_disposable: true,
          has_mx_records: false,
          is_free_provider: true,
          domain_age_days: 10,
          has_random_pattern: true,
          domain_velocity_24h: 100,
          is_corporate: false,
          has_dmarc: false
        },
        device: {
          is_headless: true,
          has_webdriver: true,
          is_automation: true,
          device_age_hours: 0.5,
          unique_users_count: 10,
          linked_to_flagged_account: true,
          device_age_days: 0,
          has_single_account: false
        },
        behaviour: {
          time_to_complete_seconds: 2,
          mouse_movements: false,
          keyboard_events: false,
          copy_paste_detected: true,
          tab_focus_changes: 0,
          scroll_events: 0
        },
        userHistory: {
          account_age_days: 1,
          prior_trust_score: 30,
          prior_flags: 5,
          linked_to_flagged_user: true
        }
      }, 'signup');

      expect(result.totalScore).toBeLessThan(40);
    });

    it('should handle missing signals gracefully', () => {
      const result = ScoreCalculator.calculateTotalScore({
        ip: undefined,
        email: undefined,
        device: undefined,
        behaviour: undefined,
        userHistory: undefined
      }, 'general');

      expect(result.totalScore).toBe(50);
    });
  });
});
