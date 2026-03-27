# Payment Cascade (Sponsor Approves Habit)

This is the core flow. When a sponsor approves a kid's habit completion, a multi-tier payment cascade tries to send sats to the kid's Lightning wallet.

## What happens step by step

```mermaid
flowchart TD
    A["Sponsor clicks 'Approve'<br/>on kid's completion"] --> B["POST /api/completions/approve<br/>completion.status = 'approved'"]
    B --> C{sat_reward > 0?}
    C -- No --> D["Done. No payment needed"]
    C -- Yes --> G["Create payment record<br/>status = 'pending'"]
    G --> H["Generate invoice from<br/>KID'S wallet via NWC"]

    H --> I["POST /api/payments/invoice<br/>kid.wallet.makeInvoice(amount)"]
    I --> J{Kid has wallet?}
    J -- No --> K["Error: kid_no_wallet<br/>Show 'Kid needs to connect wallet'"]
    J -- Yes --> L["Invoice created!<br/>Returns BOLT11 string + payment_hash"]

    L --> M{Browser has<br/>WebLN extension?<br/>e.g. Alby}

    M -- Yes --> N["TIER 1: WebLN<br/>webln.enable()<br/>webln.sendPayment(invoice)"]
    N --> O{Payment<br/>succeeded?}
    O -- Yes --> P["Sats sent instantly!<br/>Preimage confirmed on backend"]
    O -- No --> Q["Fallthrough<br/>to Tier 2"]

    M -- No --> Q
    Q --> R{Sponsor has<br/>NWC wallet<br/>connected?}
    R -- Yes --> S["TIER 2: NWC Auto-Pay<br/>POST /api/payments/{id}/pay<br/>sponsor.wallet.payInvoice(invoice)"]
    S --> T{Payment<br/>succeeded?}
    T -- Yes --> U["Sats sent via NWC!<br/>Show success toast"]
    T -- No --> V["TIER 3: Show Invoice Modal<br/>Display QR code of BOLT11 invoice"]

    R -- No --> V
    V --> W["Sponsor scans QR or copies invoice<br/>Pays with any Lightning wallet<br/>e.g. Phoenix, Muun, Zeus, Alby"]
    W --> X["Modal polls every 4 seconds<br/>GET /api/payments/{id}/status"]
    X --> Y{Invoice settled?}
    Y -- No --> X
    Y -- Yes --> Z["Payment confirmed!<br/>Show success animation"]

    style A fill:#F7A825,color:#000
    style P fill:#4CAF7D,color:#fff
    style U fill:#4CAF7D,color:#fff
    style Z fill:#4CAF7D,color:#fff
    style K fill:#EE5A5A,color:#fff
```

## Why three tiers?

| Tier | Method | How it works | When it's used |
|------|--------|-------------|----------------|
| 1 | **WebLN** | Browser extension (like Alby) pays instantly from sponsor's browser. Optional — not required | Sponsor has a WebLN-compatible extension installed |
| 2 | **NWC Auto-Pay** | Server uses sponsor's stored NWC connection to pay automatically | Sponsor connected a wallet via NWC URL |
| 3 | **QR Invoice** | Shows a QR code; sponsor pays with any Lightning wallet app | Always available as fallback — no wallet connection required on the sponsor side |

## Important: Sponsor wallet is optional

The sponsor does **not** need to connect a wallet to approve habits or pay. Here's what each scenario looks like:

| Sponsor setup | What happens on approval |
|--------------|------------------------|
| No wallet, no extension | Tier 3 only: QR code shown, sponsor pays from any external wallet |
| NWC wallet connected, no extension | Tier 2 first (auto-pay), falls back to Tier 3 if it fails |
| WebLN extension installed | Tier 1 first (instant), falls through to Tier 2, then Tier 3 |
| Both NWC + WebLN | Tries all three tiers in order |

The only wallet that's **required** is the kid's wallet — it generates the invoice that the sponsor pays.

## Related flows

- [Lightning Basics](./lightning-basics.md) - understand what invoices and NWC are
- [Invoice Modal](./invoice-modal.md) - details on the QR code fallback
- [Payment Retry](./payment-retry.md) - what happens when a payment fails
- [Wallet Connection](./wallet-connection.md) - how wallets get connected in the first place
