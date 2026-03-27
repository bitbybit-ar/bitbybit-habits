# Payment Cascade (Sponsor Approves Habit)

This is the core flow. When a sponsor approves a kid's habit completion, a multi-tier payment cascade tries to send sats to the kid's Lightning wallet.

## What happens step by step

```mermaid
flowchart TD
    A["Sponsor clicks 'Approve'<br/>on kid's completion"] --> B["POST /api/completions/approve<br/>completion.status = 'approved'"]
    B --> C{sat_reward > 0?}
    C -- No --> D["Done. No payment needed"]
    C -- Yes --> E{Sponsor has<br/>wallet connected?}
    E -- No --> F["Approved without payment<br/>paymentStatus = 'no_wallet'"]
    E -- Yes --> G["Create payment record<br/>status = 'pending'"]
    G --> H["Generate invoice from<br/>KID'S wallet via NWC"]

    H --> I["POST /api/payments/invoice<br/>kid.wallet.makeInvoice(amount)"]
    I --> J{Kid has wallet?}
    J -- No --> K["Error: kid_no_wallet<br/>Show 'Kid needs to connect wallet'"]
    J -- Yes --> L["Invoice created!<br/>Returns BOLT11 string + payment_hash"]

    L --> M{Browser has<br/>WebLN extension?<br/>e.g. Alby}

    M -- Yes --> N["TIER 1: WebLN<br/>webln.enable()<br/>webln.sendPayment(invoice)"]
    N --> O{Payment<br/>succeeded?}
    O -- Yes --> P["Sats sent instantly!<br/>Show success toast"]
    O -- No --> Q["Silent fallthrough<br/>to Tier 2"]

    M -- No --> Q
    Q --> R["TIER 2: NWC Auto-Pay<br/>POST /api/payments/{id}/pay<br/>sponsor.wallet.payInvoice(invoice)"]
    R --> S{Payment<br/>succeeded?}
    S -- Yes --> T["Sats sent via NWC!<br/>Show success toast"]
    S -- No --> U["TIER 3: Show Invoice Modal<br/>Display QR code of BOLT11 invoice"]
    U --> V["Sponsor scans QR<br/>with any Lightning wallet<br/>e.g. Phoenix, Muun, Zeus"]
    V --> W["Modal polls every 4 seconds<br/>GET /api/payments/{id}/status"]
    W --> X{Invoice settled?}
    X -- No --> W
    X -- Yes --> Y["Payment confirmed!<br/>Show success animation"]

    style A fill:#F7A825,color:#000
    style P fill:#4CAF7D,color:#fff
    style T fill:#4CAF7D,color:#fff
    style Y fill:#4CAF7D,color:#fff
    style K fill:#EE5A5A,color:#fff
    style F fill:#FF9F43,color:#000
```

## Why three tiers?

| Tier | Method | How it works | When it's used |
|------|--------|-------------|----------------|
| 1 | **WebLN** | Browser extension (like Alby) pays instantly from sponsor's browser | Sponsor has Alby or similar installed |
| 2 | **NWC Auto-Pay** | Server uses sponsor's stored NWC connection to pay | Sponsor connected wallet but no browser extension |
| 3 | **QR Invoice** | Shows a QR code; sponsor scans with any Lightning wallet app | Fallback when automated methods fail |

## Related flows

- [Lightning Basics](./lightning-basics.md) - understand what invoices and NWC are
- [Invoice Modal](./invoice-modal.md) - details on the QR code fallback
- [Payment Retry](./payment-retry.md) - what happens when a payment fails
- [Wallet Connection](./wallet-connection.md) - how wallets get connected in the first place
