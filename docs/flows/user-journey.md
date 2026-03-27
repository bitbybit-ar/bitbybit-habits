# Complete User Journey (End-to-End)

## Overview

```mermaid
flowchart TD
    subgraph "1. Onboarding"
        R1["Sponsor registers"] --> L1["Sponsor logs in"]
        L1 --> TFA["Sets up 2FA"]
        TFA --> CF["Creates family<br/>(gets invite code)"]

        R2["Kid registers"] --> L2["Kid logs in"]
        L2 --> JF["Joins family with code"]
    end

    subgraph "2. Setup"
        CF --> CH["Sponsor creates habit<br/>'Make bed' = 50 sats"]
        CF -.-> SW["Sponsor connects wallet<br/>(optional — can pay via QR)"]
        JF --> KW["Kid connects<br/>Lightning wallet (NWC)<br/>(required to receive sats)"]
    end

    subgraph "3. Daily Loop"
        CH --> COMP["Kid completes habit<br/>taps card in dashboard"]
        KW --> COMP
        COMP --> PEND["Completion pending<br/>Sponsors notified"]
        PEND --> APPROVE["Sponsor approves"]
        APPROVE --> PAY["Payment cascade:<br/>WebLN -> NWC -> QR"]
        PAY --> SATS["Kid receives sats!"]
        SATS --> COMP
    end

    style SATS fill:#F7A825,color:#000
    style PAY fill:#4DB6AC,color:#fff
    style SW fill:#FF9F43,color:#000
```

## Step-by-step with links

### Phase 1: Onboarding
1. **Sponsor registers** an account ([Registration & Login](./auth.md))
2. **Sponsor logs in** and is prompted to set up 2FA ([Two-Factor Auth](./two-factor-auth.md))
3. **Sponsor creates a family** and gets a 6-character invite code ([Family Management](./family-management.md))
4. **Kid registers** and logs in
5. **Kid joins family** using the invite code

### Phase 2: Setup
6. **Kid connects Lightning wallet** via NWC URL or browser extension ([Wallet Connection](./wallet-connection.md)) -- **required** to receive payments
7. **Sponsor connects wallet** (optional) via NWC URL or browser extension -- enables auto-pay; without it, sponsor pays via QR scan
8. **Sponsor creates habits** with sat rewards ([Habit Lifecycle](./habit-lifecycle.md))

### Phase 3: Daily Loop
9. **Kid completes habit** by tapping the card ([Habit Completion](./habit-completion.md))
10. **Sponsors get notified** of pending completion ([Notifications](./notifications.md))
11. **Sponsor approves** the completion
12. **Payment cascade fires**: WebLN, NWC auto-pay, or QR invoice ([Payment Cascade](./payment-cascade.md))
13. **Kid receives sats** in their Lightning wallet
14. **Streaks grow** with consecutive daily completions ([Stats & Streaks](./stats-and-streaks.md))
15. Repeat from step 9!

### What if something goes wrong?

| Scenario | What happens |
|----------|-------------|
| Kid has no wallet | Invoice can't be generated — sponsor sees "Kid needs to connect wallet" |
| Sponsor has no wallet | Tiers 1-2 are skipped, QR invoice shown directly |
| Insufficient funds | Error toast shown, QR invoice shown as fallback |
| NWC service down | Auto-pay fails silently, QR invoice shown as fallback |
| Invoice expires | Sponsor can retry from payments tab — new invoice is generated |
| Polling fails | Modal shows connection warning, keeps retrying |
