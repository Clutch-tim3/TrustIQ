# TrustIQ API

## 60-Second Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Start the database and Redis**:
   ```bash
   docker-compose up -d db redis
   ```

4. **Run migrations and seed data**:
   ```bash
   npm run prisma:migrate
   npm run seed:disposable
   ```

5. **Start the API server**:
   ```bash
   npm run dev
   ```

6. **Test the API**:
   Open `test.http` in VS Code and run any request with `x-rapidapi-key: demo-key`

## Overview

TrustIQ is a complete user trust layer API that answers these five critical questions:
- Is this a real person or a bot?
- Is this person who they claim to be?
- How much should I trust this account right now?
- Has this device been seen before?
- Is this behavior consistent with legitimate use?

## API Endpoints

### 1. Trust Assessment

#### POST /v1/assess
Unified trust assessment - the core endpoint.
```typescript
interface AssessRequest {
  action: 'signup' | 'login' | 'payment' | 'content_post' | 'withdrawal' | 
          'account_update' | 'api_access' | 'message_send' | 'listing_create';
  user_id?: string;
  email?: string;
  phone?: string;
  ip?: string;
  device_fingerprint?: DeviceFingerprint;
  behaviour?: BehaviourData;
  context?: ContextData;
}
```

#### POST /v1/assess/email
Standalone email risk assessment.

#### POST /v1/assess/ip
Standalone IP risk assessment.

#### POST /v1/assess/device
Standalone device fingerprint assessment.

#### POST /v1/assess/phone
Phone number trust assessment.

#### POST /v1/assess/identity
Lightweight identity consistency check.

#### POST /v1/assess/batch
Batch assess up to 50 users simultaneously.

### 2. Event Tracking

#### POST /v1/events/track
Track user behavior events to build trust history.

#### POST /v1/events/report
Report confirmed fraudulent activity to improve global signal quality.

### 3. User Trust Profiles

#### GET /v1/users/:user_id/profile
Get complete trust profile for a user.

#### PATCH /v1/users/:user_id/trust-score
Manually adjust a user's trust score.

#### GET /v1/users/:user_id/linked-accounts
Get accounts linked to a user via shared signals.

### 4. Velocity & Anomaly Detection

#### GET /v1/velocity/check
Real-time velocity check for any entity (IP, email domain, device).

#### GET /v1/anomalies
Detect anomalies across your user base.

### 5. Configuration

#### GET /v1/config/thresholds
Get current trust score thresholds.

#### POST /v1/config/thresholds
Update trust score thresholds for your app.

### 6. Analytics

#### GET /v1/stats
Get usage statistics and trust metrics.

### 7. Health Check

#### GET /v1/health
Check API health and dependencies.

## Integration Guide

### Frontend Integration

1. Include the TrustIQ collector:
   ```html
   <script src="https://cdn.trustiq.io/client/trustiq-collector.js"></script>
   ```

2. Collect signals and send to /assess:
   ```javascript
   // At the beginning of your page
   TrustIQ.setApiKey('YOUR_API_KEY');

   // When user submits a form
   document.getElementById('signup-form').addEventListener('submit', async (e) => {
     e.preventDefault();
     
     const { deviceFingerprint, behavior } = TrustIQ.collect();
     
     const response = await fetch('https://api.trustiq.io/v1/assess', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'x-rapidapi-key': 'YOUR_API_KEY'
       },
       body: JSON.stringify({
         action: 'signup',
         email: document.getElementById('email').value,
         ip: await getClientIp(),
         device_fingerprint: deviceFingerprint,
         behaviour: behavior
       })
     });

     const assessment = await response.json();
     if (assessment.verdict === 'block') {
       showBlockMessage(assessment.risk_factors);
     } else if (assessment.verdict === 'challenge') {
       showChallenge(assessment.challenge_options);
     } else {
       completeSignup();
     }
   });
   ```

### Node.js SDK

```javascript
import { TrustIQ } from '@trustiq/api-sdk';

const trustiq = new TrustIQ('YOUR_API_KEY');

// Assess a user
const assessment = await trustiq.assess({
  action: 'payment',
  user_id: 'usr_123',
  email: 'john@example.com',
  ip: '41.13.67.45'
});

if (assessment.trust_score < 40) {
  await trustiq.blockUser('usr_123');
}
```

## Trust Score Model

### Score Calculation (0-100)

**IP Signals (±25 points)**:
- VPN: -8
- Proxy: -12
- Tor: -20
- Datacenter IP: -10
- Abuse score > 50: -15
- IP velocity > 10 signups/hour: -10
- IP velocity > 50 signups/hour: -20
- Clean residential IP: +5

**Email Signals (±20 points)**:
- Disposable domain: -15
- No MX records: -20
- Free provider for business: -5
- Domain age < 30 days: -10
- Random pattern: -8
- Domain velocity > 20/day: -8
- Corporate + DMARC: +10
- Domain age > 5 years: +5

**Device Signals (±20 points)**:
- Headless browser: -15
- WebDriver: -20
- Automation: -20
- New device < 1 hour: -5
- > 5 users on device: -10
- Linked to flagged account: -15
- Device age > 30 days: +10
- Single account per device: +5

**Behavior Signals (±15 points)**:
- Time to complete < 3 seconds: -12
- Time to complete < 8 seconds: -5
- No mouse/keyboard: -10
- Copy-paste: -8
- 15-120 seconds completion: +8
- Scroll events: +3

**User History (±20 points)**:
- Account age > 90 days: +10
- Account age > 365 days: +15
- Prior trust score > 80: +10
- Prior flags > 0: -10
- Prior flags > 3: -20
- Linked to flagged user: -15

### Verdict Thresholds

| Score Range | Verdict | Risk Level |
|-------------|---------|------------|
| 80-100      | allow   | low        |
| 61-79       | allow   | medium     |
| 40-60       | challenge | medium    |
| 20-39       | challenge | high      |
| 0-19        | block   | critical   |

## Pricing

| Tier          | Monthly Reqs | Req/sec | Features                          |
|---------------|--------------|---------|-----------------------------------|
| FREE          | 1,000        | 2       | /assess only                      |
| STARTER ($29) | 20,000       | 10      | All endpoints                     |
| PRO ($99)     | 200,000      | 50      | All + anomalies + stats           |
| SCALE ($299)  | 2,000,000    | 200     | All + batch + webhooks            |
| ENTERPRISE    | Unlimited    | 500     | Custom SLAs                       |

## Technology Stack

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript 5
- **Framework**: Express.js 4
- **Database**: PostgreSQL 16 (Prisma ORM)
- **Cache**: Redis 7
- **Queue**: BullMQ
- **AI**: Anthropic Claude API
- **Validation**: Zod
- **Auth**: X-RapidAPI-Key
- **Logging**: Winston
- **Security**: Helmet, HPP, XSS-Clean

## Privacy & Security

- All PII (emails, phones, IPs) stored as SHA256 hashes
- No raw data persisted in database or logs
- GDPR/POPIA compliant by architecture
- All API calls use HTTPS
- Rate limiting per API key

## Support

- Documentation: https://docs.trustiq.io
- Support: support@trustiq.io
- Status: https://status.trustiq.io
