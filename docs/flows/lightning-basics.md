# Lightning Network Basics

If you're new to Lightning, here's how the pieces fit together in BitByBit.

## Key Concepts

```mermaid
flowchart LR
    subgraph "Bitcoin Network (slow, expensive)"
        BTC["Bitcoin Blockchain<br/>~10 min blocks<br/>Higher fees"]
    end

    subgraph "Lightning Network (fast, cheap)"
        LN["Payment Channels<br/>Instant settlement<br/>Near-zero fees<br/>Micropayments possible"]
    end

    BTC <-- "Open/Close<br/>channels" --> LN

    subgraph "How BitByBit uses Lightning"
        direction TB
        KID["Kid's Wallet<br/>(receives sats)"]
        SPONSOR["Sponsor's Wallet<br/>(sends sats)"]
        SPONSOR -- "Pays invoice<br/>via Lightning" --> KID
    end

    LN --- KID
    LN --- SPONSOR
```

## What is an Invoice? (BOLT11)

A Lightning invoice is like a payment request. The kid's wallet creates it, and the sponsor's wallet pays it.

```mermaid
sequenceDiagram
    participant Kid as Kid's Wallet
    participant Server as BitByBit Server
    participant Sponsor as Sponsor's Wallet

    Note over Kid,Sponsor: Kid completed a habit, sponsor approved it

    Server->>Kid: "Create an invoice for 50 sats"<br/>(NWC: makeInvoice)
    Kid-->>Server: BOLT11 invoice string<br/>+ payment_hash (unique ID)

    Note over Server: BOLT11 looks like:<br/>lnbc500n1pj9...very long string...<br/>It encodes: amount, destination, expiry

    Server->>Sponsor: "Pay this invoice"<br/>(NWC: payInvoice)
    Sponsor-->>Server: preimage (proof of payment)

    Note over Server: preimage is the "receipt"<br/>SHA256(preimage) = payment_hash<br/>This proves the payment happened

    Server->>Kid: "Check if invoice was paid"<br/>(NWC: lookupInvoice)
    Kid-->>Server: settled_at = timestamp<br/>(Yes, payment received!)
```

## Key terms

| Term | What it is | Analogy |
|------|-----------|---------|
| **BOLT11** | Invoice format string (starts with `lnbc...`) | A bill/check at a restaurant |
| **payment_hash** | Unique ID for the invoice (SHA256 hash) | The invoice number |
| **preimage** | Secret revealed when paid; SHA256(preimage) = payment_hash | The receipt/proof of payment |
| **sats** | Smallest Bitcoin unit (1 BTC = 100,000,000 sats) | Cents to dollars |
| **millisats** | 1/1000 of a sat (used internally by Lightning) | Sub-cent precision |

## What is NWC? (Nostr Wallet Connect)

NWC is a protocol that lets our server remotely control a user's wallet (with their permission).

```mermaid
flowchart TD
    subgraph "NWC = Remote Control for Wallets"
        direction TB
        A["NWC URL looks like:<br/>nostr+walletconnect://pubkey?secret=...&relay=..."]
        A --> B["It's a permission string<br/>that lets our server talk to<br/>your wallet remotely"]
        B --> C["Like giving a valet your car key,<br/>but only for specific actions"]
    end

    subgraph "What BitByBit does with NWC"
        direction TB
        D["makeInvoice()"] --> E["Create invoice in<br/>kid's wallet"]
        F["payInvoice()"] --> G["Send payment from<br/>sponsor's wallet"]
        H["lookupInvoice()"] --> I["Check if payment<br/>arrived in kid's wallet"]
        J["getBalance()"] --> K["Show wallet balance<br/>in dashboard"]
    end

    subgraph "Security"
        direction TB
        L["NWC URL is encrypted<br/>with AES-256-GCM<br/>before storing in database"]
        M["Decrypted only when<br/>making a payment"]
        N["Never sent to the browser"]
    end
```

## WebLN vs NWC

| | WebLN | NWC |
|---|---|---|
| **What** | Browser extension API | Remote wallet protocol |
| **Examples** | Alby extension | Any NWC-compatible wallet (Alby, Mutiny, etc.) |
| **How it works** | Extension injects `window.webln` into the browser | Server connects to wallet via relay using NWC URL |
| **Required?** | No — completely optional | Kid: yes (to receive). Sponsor: no (can pay via QR) |
| **Used for** | Tier 1 instant payment (if available) | Tier 2 auto-pay + invoice generation |

Neither Alby nor any specific wallet is required. Users can connect any NWC-compatible wallet by pasting their NWC URL directly.

## Related flows

- [Wallet Connection](./wallet-connection.md) - how NWC URLs are stored and encrypted
- [Payment Cascade](./payment-cascade.md) - how all these pieces work together
