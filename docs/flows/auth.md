# Registration & Login

## Registration

```mermaid
flowchart TD
    A["User fills form:<br/>email, username, password, display_name"] --> B{Rate limit OK?<br/>max 3 per 15min per IP}
    B -- No --> C["429 Too Many Requests<br/>Try again later"]
    B -- Yes --> D{All fields<br/>provided?}
    D -- No --> E["400 Bad Request<br/>Missing fields"]
    D -- Yes --> F["Hash password with bcryptjs<br/>(10 salt rounds)"]
    F --> G["INSERT into users table<br/>(email/username lowercased)"]
    G --> H{Duplicate email<br/>or username?}
    H -- Yes --> I["409 Conflict<br/>'Email or username already exists'"]
    H -- No --> J["Return user object<br/>(no password hash!)"]

    style C fill:#EE5A5A,color:#fff
    style E fill:#EE5A5A,color:#fff
    style I fill:#EE5A5A,color:#fff
    style J fill:#4CAF7D,color:#fff
```

## Login

```mermaid
flowchart TD
    A["User submits:<br/>login (email or username) + password"] --> B{Rate limit OK?<br/>max 5 per 15min per IP}
    B -- No --> C["429 Too Many Requests"]
    B -- Yes --> D["Find user by email OR username<br/>(case-insensitive)"]
    D --> E{User found?}
    E -- No --> F["401 Unauthorized"]
    E -- Yes --> G{Account locked?<br/>locked_until > now}
    G -- Yes --> H["403 Account locked<br/>Try again in 30 minutes"]
    G -- No --> I["Verify password with bcryptjs"]
    I --> J{Password valid?}
    J -- No --> K["Increment failed_login_attempts"]
    K --> L{Attempts >= 10?}
    L -- Yes --> M["Lock account for 30 minutes<br/>Set locked_until"]
    L -- No --> N["401 Invalid credentials"]
    M --> N
    J -- Yes --> O["Reset failed_login_attempts to 0<br/>Clear locked_until"]
    O --> P["Fetch user role from<br/>family membership"]
    P --> Q{2FA enabled?}
    Q -- Yes --> R["Create temp token (5 min)<br/>Return requires2FA: true"]
    Q -- No --> S{Is sponsor<br/>without 2FA?}
    S -- Yes --> T["Create session + cookie<br/>Return requires2FASetup: true"]
    S -- No --> U["Create session + cookie<br/>Return user data + role"]

    style C fill:#EE5A5A,color:#fff
    style F fill:#EE5A5A,color:#fff
    style H fill:#EE5A5A,color:#fff
    style N fill:#EE5A5A,color:#fff
    style R fill:#F7A825,color:#000
    style T fill:#F7A825,color:#000
    style U fill:#4CAF7D,color:#fff
```

## Security measures

| Protection | Details |
|-----------|---------|
| **Rate limiting** | Register: 3/15min, Login: 5/15min (per IP) |
| **Password hashing** | bcryptjs with 10 salt rounds |
| **Account lockout** | 10 failed attempts = 30-minute lock |
| **Session** | JWT in httpOnly cookie, 7-day expiry, SameSite=lax |

## Related flows

- [Two-Factor Auth](./two-factor-auth.md) - what happens when 2FA is enabled
- [Family Management](./family-management.md) - role is determined by family membership
