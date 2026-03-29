# Invoice Modal (QR Polling)

When WebLN and NWC auto-pay both fail, the sponsor sees a QR code modal as a last resort.

## Polling Flow

```mermaid
sequenceDiagram
    participant Sponsor as Sponsor (Browser)
    participant Modal as Invoice Modal
    participant API as BitByBit API
    participant KidWallet as Kid's Wallet (NWC)

    Sponsor->>Modal: Opens with BOLT11 invoice
    Modal->>Modal: Display QR code<br/>+ "Copy Invoice" button

    Note over Sponsor: Sponsor opens Phoenix/Muun/Zeus app,<br/>scans QR code, and pays

    loop Every 4 seconds
        Modal->>API: GET /api/payments/{id}/status
        API->>API: Check DB: already paid?
        alt Already marked paid in DB
            API-->>Modal: { settled: true }
        else Still pending
            API->>KidWallet: lookupInvoice(payment_hash)<br/>(5-second timeout)
            alt Invoice settled
                KidWallet-->>API: { settled_at: "2026-03-27T..." }
                API->>API: Update payment: status=paid
                API-->>Modal: { settled: true }
            else Not yet / timeout
                KidWallet-->>API: null / timeout
                API-->>Modal: { settled: false }
            end
        end
    end

    Modal->>Modal: Show success animation<br/>(lightning bounce)
    Modal->>Modal: Auto-close after 2 seconds
```

## How it works

1. Modal displays the BOLT11 invoice as a QR code
2. Sponsor scans with any Lightning wallet app (Phoenix, Muun, Zeus, etc.)
3. Modal polls the server every 4 seconds asking "was it paid?"
4. Server checks the kid's wallet via NWC `lookupInvoice()`
5. When settled, the modal shows a celebration animation and auto-closes

## Why poll the kid's wallet?

The invoice was created by the kid's wallet, so only the kid's wallet knows when it was paid. The server asks the kid's wallet "did you receive that payment?" using the `payment_hash` as the lookup key.

## Related flows

- [Payment Cascade](./payment-cascade.md) - the full 3-tier flow that leads here
- [Payment Retry](./payment-retry.md) - what happens if the invoice expires
