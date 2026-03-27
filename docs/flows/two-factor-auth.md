# Two-Factor Authentication (2FA)

## Setup (Sponsor enables 2FA)

```mermaid
sequenceDiagram
    participant Sponsor as Sponsor (Browser)
    participant API as BitByBit API
    participant DB as Database

    Sponsor->>API: POST /api/auth/2fa/setup
    API->>API: Generate TOTP secret<br/>(SHA1, 6 digits, 30s window)
    API->>API: Generate QR code data URI<br/>from otpauth:// URI
    API->>DB: Store totp_secret<br/>totp_enabled = false (not active yet)
    API-->>Sponsor: { qrCode, otpauthUri }

    Note over Sponsor: Sponsor scans QR with<br/>Google Authenticator, Authy, etc.

    Sponsor->>API: POST /api/auth/2fa/confirm<br/>{ code: "123456" }
    API->>API: Validate TOTP code<br/>(30s window, delta=1)
    API->>API: Generate 10 recovery codes
    API->>DB: Hash each recovery code with bcryptjs<br/>Set totp_enabled = true<br/>Store hashed recovery_codes
    API-->>Sponsor: { recoveryCodes: [...plaintext codes] }<br/>"Save these somewhere safe!"
```

## Validation (Login with 2FA)

```mermaid
flowchart TD
    A["User logged in successfully<br/>but 2FA is enabled"] --> B["Server returns tempToken<br/>(5-minute expiry)"]
    B --> C["User enters 6-digit<br/>TOTP code from app"]
    C --> D["POST /api/auth/2fa/validate<br/>{ tempToken, code }"]
    D --> E{Verify tempToken<br/>is valid JWT?}
    E -- No --> F["400 Invalid token"]
    E -- Yes --> G{TOTP code<br/>matches secret?}
    G -- Yes --> H["Create full session<br/>Set cookie, return user"]
    G -- No --> I{Try recovery codes:<br/>compare against<br/>hashed codes}
    I -- Match found --> J["Remove used recovery code<br/>from database"]
    J --> H
    I -- No match --> K["400 Invalid 2FA code"]

    style F fill:#EE5A5A,color:#fff
    style K fill:#EE5A5A,color:#fff
    style H fill:#4CAF7D,color:#fff
```

## How TOTP works

1. A shared secret is generated and stored (encrypted) on the server
2. The user adds this secret to their authenticator app via QR code
3. Both server and app use the same algorithm: `HMAC-SHA1(secret, floor(time/30))`
4. This produces a new 6-digit code every 30 seconds
5. The server accepts the current code and the previous one (delta=1) to account for clock drift

## Recovery codes

- 10 codes generated during setup
- Each code is hashed with bcryptjs before storing
- One-time use: once a recovery code is used, it's permanently removed
- Shown to the user only once during setup (never retrievable again)

## Related flows

- [Registration & Login](./auth.md) - the login flow that triggers 2FA
