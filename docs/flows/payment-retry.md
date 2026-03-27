# Payment Retry

When a payment fails (NWC error, timeout, etc.), sponsors can retry from the payments tab.

## Retry Flow

```mermaid
flowchart TD
    A["Sponsor clicks 'Retry Payment'"] --> B["POST /api/payments/retry<br/>{ payment_id }"]
    B --> C{Payment exists<br/>and status = failed?}
    C -- No --> D["404 or 400 Error"]
    C -- Yes --> E["Reset status to 'pending'"]
    E --> F{Has existing<br/>BOLT11 invoice?}
    F -- No --> G["Return needs_new_invoice: true<br/>Client must generate new invoice"]
    F -- Yes --> H["Get sponsor's NWC wallet"]
    H --> I["Try payInvoice(existing_invoice)"]
    I --> J{Success?}
    J -- Yes --> K["status = 'paid'<br/>Return paid: true"]
    J -- No --> L{Error says<br/>'expired'?}
    L -- Yes --> M["Clear old invoice<br/>status = 'failed'<br/>Return needs_new_invoice: true"]
    L -- No --> N["status = 'failed'<br/>Return error message"]

    G --> O["Client calls<br/>POST /api/payments/invoice<br/>to get fresh BOLT11"]
    O --> P["Restart payment cascade<br/>(WebLN -> NWC -> QR)"]

    style K fill:#4CAF7D,color:#fff
    style D fill:#EE5A5A,color:#fff
    style N fill:#EE5A5A,color:#fff
    style M fill:#FF9F43,color:#000
```

## Why do invoices expire?

Lightning invoices have a built-in expiry (usually 1 hour). If the sponsor doesn't pay in time, the invoice becomes invalid and a new one must be generated from the kid's wallet.

## Related flows

- [Payment Cascade](./payment-cascade.md) - the initial payment attempt
- [Invoice Modal](./invoice-modal.md) - the QR fallback that might time out
