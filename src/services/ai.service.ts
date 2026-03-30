import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export class AiService {
  async generateExplanation(params: any): Promise<string> {
    if (!process.env.ENABLE_AI_EXPLANATIONS || process.env.ENABLE_AI_EXPLANATIONS === 'false') {
      return this.generateDefaultExplanation(params);
    }

    try {
      const prompt = this.buildExplanationPrompt(params);
      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20250514',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      });

      const textBlock = response.content.find(block => 'text' in block);
      return textBlock?.text || this.generateDefaultExplanation(params);
    } catch (error) {
      console.error('Error generating AI explanation:', error);
      return this.generateDefaultExplanation(params);
    }
  }

  private buildExplanationPrompt(params: any): string {
    return `You are TrustIQ, an AI-powered trust assessment system. Generate a concise, professional explanation for the assessment of a user action.

**Input Data:**
- Action: ${params.action}
- Email: ${params.email || 'Not provided'}
- IP: ${params.ip || 'Not provided'}
- Device: ${params.device ? 'Provided' : 'Not provided'}
- Trust Score: ${params.trustScore}
- Verdict: ${params.verdict}

**Signal Results:**
${this.formatSignalResults(params)}

**Context:**
- Risk Factors: ${params.riskFactors?.length || 0}
- Positive Factors: ${params.positiveFactors?.length || 0}
- Confidence: ${params.confidence || 'medium'}

**Output Requirements:**
- Maximum 3 sentences
- Clear and actionable
- Neutral tone
- No jargon
- Start with the verdict and score
- Highlight key risk or positive signals
- Recommendation should be specific to the action

**Example for Allow Verdict:**
"Score: 82/100 (Allow). User has a corporate email domain with valid DMARC and a residential IP with clean reputation. Form completed in 47 seconds, which is typical for humans."

**Example for Challenge Verdict:**
"Score: 45/100 (Challenge). User has a disposable email domain and form completed in 2 seconds, indicating potential automation. Recommended: Email OTP verification."

**Your Response:**`;
  }

  private formatSignalResults(params: any): string {
    const signals: string[] = [];
    
    if (params.emailSignalResult) {
      signals.push('Email: ' + this.formatEmailSignals(params.emailSignalResult));
    }
    
    if (params.ipSignalResult) {
      signals.push('IP: ' + this.formatIpSignals(params.ipSignalResult));
    }
    
    if (params.deviceSignalResult) {
      signals.push('Device: ' + this.formatDeviceSignals(params.deviceSignalResult));
    }
    
    if (params.behaviourSignalResult) {
      signals.push('Behaviour: ' + this.formatBehaviourSignals(params.behaviourSignalResult));
    }
    
    return signals.join('\n');
  }

  private formatEmailSignals(email: any): string {
    const parts: string[] = [];
    
    if (email.is_disposable) parts.push('Disposable domain');
    if (!email.has_mx) parts.push('No MX records');
    if (email.is_free_provider) parts.push('Free provider');
    if (email.domain_age_days) parts.push(`${email.domain_age_days} day domain`);
    if (email.format_anomalies?.length) parts.push('Format anomalies');
    
    return parts.length ? parts.join(', ') : 'Clean domain';
  }

  private formatIpSignals(ip: any): string {
    const parts: string[] = [];
    
    if (ip.is_vpn) parts.push('VPN');
    if (ip.is_proxy) parts.push('Proxy');
    if (ip.is_tor) parts.push('Tor');
    if (ip.is_datacenter) parts.push('Datacenter');
    if (ip.abuse_score > 50) parts.push(`Abuse score ${ip.abuse_score}`);
    
    return parts.length ? parts.join(', ') : 'Clean residential IP';
  }

  private formatDeviceSignals(device: any): string {
    const parts: string[] = [];
    
    if (device.is_headless) parts.push('Headless');
    if (device.is_automation) parts.push('Automation');
    if (device.has_webdriver) parts.push('WebDriver');
    if (device.unique_users_on_device > 1) parts.push(`${device.unique_users_on_device} users`);
    
    return parts.length ? parts.join(', ') : 'Clean device';
  }

  private formatBehaviourSignals(behaviour: any): string {
    const parts: string[] = [];
    
    if (behaviour.time_to_complete_seconds < 3) parts.push('Rapid completion');
    if (!behaviour.mouse_movements_detected && !behaviour.keyboard_events_detected) parts.push('No interaction');
    if (behaviour.copy_paste_detected) parts.push('Copy-paste');
    
    return parts.length ? parts.join(', ') : 'Human behaviour';
  }

  private generateDefaultExplanation(params: any): string {
    if (params.verdict === 'allow') {
      return `Score: ${params.trustScore}/100 (Allow). User shows strong trust signals across most dimensions.`;
    } else if (params.verdict === 'challenge') {
      return `Score: ${params.trustScore}/100 (Challenge). Some risk signals require verification.`;
    } else if (params.verdict === 'block') {
      return `Score: ${params.trustScore}/100 (Block). Multiple high-risk signals indicate fraud or automation.`;
    } else {
      return `Score: ${params.trustScore}/100 (Manual Review). Complex risk pattern requires human judgment.`;
    }
  }
}