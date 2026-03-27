# Payment Cascade (Sponsor Approves Habit)

This is the core flow. When a sponsor approves a kid's habit completion, a multi-tier payment cascade sends sats to the kid's Lightning wallet.

## What happens step by step

```mermaid
flowchart TD
    A["Sponsor clicks 'Approve'<br/>on kid's completion"] --> B["POST /api/completions/approve"]
    B --> C{sat_reward > 0?}
    C -- No --> D["Approved ✓<br/>No payment needed"]
    C -- Yes --> E{Kid has wallet<br/>connected?}
    E -- No --> F["APPROVAL FAILS ✗<br/>'Kid must connect a wallet'"]
    E -- Yes --> G["completion.status = 'approved'<br/>Create payment record (pending)"]
    G --> H["Generate invoice from kid's wallet<br/>(internal — user never sees this)"]
    H --> I{Invoice generated?}
    I -- No --> J["Error: invoice generation failed<br/>Payment stays pending for retry"]

    I -- Yes --> K{Sponsor has<br/>WebLN extension?}

    K -- Yes --> L["TIER 1: WebLN<br/>webln.sendPayment(invoice)"]
    L --> M{Success?}
    M -- Yes --> N["PAID ✓<br/>Preimage confirmed on backend"]
    M -- No --> O["Fall through ↓"]

    K -- No --> O
    O --> P{Sponsor has<br/>NWC wallet?}

    P -- Yes --> Q["TIER 2: NWC Auto-Pay<br/>sponsor.nwc.payInvoice(invoice)"]
    Q --> R{Success?}
    R -- Yes --> S["PAID ✓"]
    R -- "Insufficient funds" --> T["Error toast<br/>Fall through ↓"]
    R -- "Other error" --> U["Fall through ↓"]

    P -- No --> V
    T --> V
    U --> V
    V["TIER 3: Show QR Invoice Modal<br/>Same invoice shown as QR code"]
    V --> W["Sponsor scans & pays<br/>from any Lightning wallet"]
    W --> X["Modal polls every 4s"]
    X --> Y{Settled?}
    Y -- Yes --> Z["PAID ✓"]
    Y -- "Not paid<br/>before expiry" --> EX["Invoice expires<br/>Payment marked as failed"]
    EX --> RT["Sponsor can retry anytime<br/>from Payments tab"]

    style A fill:#F7A825,color:#000
    style N fill:#4CAF7D,color:#fff
    style S fill:#4CAF7D,color:#fff
    style Z fill:#4CAF7D,color:#fff
    style F fill:#EE5A5A,color:#fff
    style J fill:#FF9F43,color:#000
    style EX fill:#EE5A5A,color:#fff
```

## The three tiers

| Tier | Method | What happens | User sees |
|------|--------|-------------|-----------|
| 1 | **WebLN** | Browser extension pays the invoice automatically | Nothing — just a "Paid!" toast |
| 2 | **NWC Auto-Pay** | Server uses sponsor's stored NWC wallet to pay | Nothing — just a "Paid!" toast |
| 3 | **QR Invoice** | Invoice shown as QR code, sponsor pays from any wallet app | QR code modal |

- The invoice is generated **once** from the kid's wallet and reused across all 3 tiers
- In Tiers 1 and 2, the user never sees the invoice — it's an internal protocol step
- In Tier 3, the same invoice is displayed as a scannable QR code
- Lightning invoices have a built-in expiry. If not paid in time, the payment is marked as failed and can be [retried](./payment-retry.md)

## Sponsor wallet is optional

| Sponsor setup | What happens |
|--------------|-------------|
| No wallet, no extension | Tier 3 only: QR code shown |
| NWC wallet connected | Tier 2 first (auto-pay), Tier 3 if it fails |
| WebLN extension installed | Tier 1 first (instant), then Tier 2, then Tier 3 |
| Both NWC + WebLN | Tries all three in order |

The only **required** wallet is the kid's — it generates the invoice. If the kid has no wallet, the approval fails.

## Error handling

| Error | When | User sees |
|-------|------|-----------|
| Kid has no wallet | During approval | Approval fails: "Kid must connect a wallet" |
| Invoice generation failed | NWC error | "Error generating invoice" — payment pending for retry |
| WebLN rejected | User declines in extension | "Declined" toast, falls to next tier |
| Insufficient funds | NWC auto-pay | "Insufficient funds" toast, falls to QR |
| NWC error | Auto-pay fails | Silent fallthrough to QR |
| Polling issues | QR modal | "Connection issues" warning, keeps retrying |
| Invoice expired | Not paid in time | Payment marked failed, retry from Payments tab |

## Related flows

- [Payment Retry](./payment-retry.md) — how failed/expired payments are retried
- [Invoice Modal](./invoice-modal.md) — QR code fallback details
- [Wallet Connection](./wallet-connection.md) — how wallets get connected
