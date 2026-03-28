# Wallet Connection & Encryption

How a user connects their Lightning wallet and how we protect the connection string.

## Connection Flow

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant API as BitByBit API
    participant DB as Database
    participant Crypto as AES-256-GCM

    User->>API: POST /api/wallets<br/>{ nwc_url: "nostr+walletconnect://..." }

    API->>API: Validate URL starts with<br/>"nostr+walletconnect://"

    API->>Crypto: encrypt(nwc_url)
    Note over Crypto: 1. Generate random 16-byte IV<br/>2. Encrypt with AES-256-GCM<br/>3. Get 16-byte auth tag<br/>4. Pack: IV + ciphertext + tag<br/>5. Encode as base64

    Crypto-->>API: encrypted_string (base64)

    API->>DB: Store encrypted_string<br/>(plaintext URL never stored)

    API-->>User: { id, label, active, connected: true }<br/>(encrypted URL never sent back)

    Note over User,DB: Later, when making a payment...

    API->>DB: Fetch encrypted NWC URL
    DB-->>API: encrypted_string
    API->>Crypto: decrypt(encrypted_string)
    Note over Crypto: 1. Decode base64<br/>2. Extract IV (first 16 bytes)<br/>3. Extract auth tag (last 16 bytes)<br/>4. Decrypt with AES-256-GCM<br/>5. Verify auth tag (tamper check)
    Crypto-->>API: original nwc_url
    API->>API: Use NWC URL to talk to wallet<br/>Then discard from memory
```

## Why AES-256-GCM?

- **AES-256**: Military-grade encryption standard (NIST approved)
- **GCM mode**: Provides both encryption AND authenticity verification
- **Random IV**: Each encryption uses a unique initialization vector (no patterns)
- **Auth tag**: If anyone tampers with the encrypted data, decryption fails

## What's protected

| Data | Storage | Sent to browser? |
|------|---------|-----------------|
| NWC URL (plaintext) | Never stored | Never |
| Encrypted NWC URL | In database | Never |
| Wallet label | In database | Yes |
| Wallet active status | In database | Yes |
| Encryption key | Environment variable | Never |

## Related flows

- [Payment Cascade](./payment-cascade.md) - when decryption happens during payments
