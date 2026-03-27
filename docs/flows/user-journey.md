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
        CF --> SW["Sponsor connects<br/>Lightning wallet (NWC)"]
        JF --> KW["Kid connects<br/>Lightning wallet (NWC)"]
    end

    subgraph "3. Daily Loop"
        SW --> CH["Sponsor creates habit<br/>'Make bed' = 50 sats"]
        KW --> COMP["Kid completes habit<br/>taps card in dashboard"]
        CH --> COMP
        COMP --> PEND["Completion pending<br/>Sponsors notified"]
        PEND --> APPROVE["Sponsor approves"]
        APPROVE --> PAY["Payment cascade:<br/>WebLN -> NWC -> QR"]
        PAY --> SATS["Kid receives sats!"]
        SATS --> COMP
    end

    style SATS fill:#F7A825,color:#000
    style PAY fill:#4DB6AC,color:#fff
```

## Step-by-step with links

### Phase 1: Onboarding
1. **Sponsor registers** an account ([Registration & Login](./auth.md))
2. **Sponsor logs in** and is prompted to set up 2FA ([Two-Factor Auth](./two-factor-auth.md))
3. **Sponsor creates a family** and gets a 6-character invite code ([Family Management](./family-management.md))
4. **Kid registers** and logs in
5. **Kid joins family** using the invite code

### Phase 2: Setup
6. **Sponsor connects Lightning wallet** via NWC URL ([Wallet Connection](./wallet-connection.md))
7. **Kid connects Lightning wallet** via NWC URL
8. **Sponsor creates habits** with sat rewards ([Habit Lifecycle](./habit-lifecycle.md))

### Phase 3: Daily Loop
9. **Kid completes habit** by tapping the card ([Habit Completion](./habit-completion.md))
10. **Sponsors get notified** of pending completion ([Notifications](./notifications.md))
11. **Sponsor approves** the completion
12. **Payment cascade fires**: WebLN, NWC, or QR ([Payment Cascade](./payment-cascade.md))
13. **Kid receives sats** in their Lightning wallet
14. **Streaks grow** with consecutive daily completions ([Stats & Streaks](./stats-and-streaks.md))
15. Repeat from step 9!
