# Family Management

## Creating a Family & Joining

```mermaid
flowchart TD
    subgraph "Sponsor creates family"
        A["Sponsor clicks 'Create Family'<br/>enters family name"] --> B["POST /api/families"]
        B --> C["Generate 6-char invite code<br/>(A-Z, 2-9, no 0/1/I/O)"]
        C --> D["Create family record<br/>+ add sponsor as member<br/>role = 'sponsor'"]
        D --> E["Return family with invite_code<br/>Sponsor shares code with kid"]
    end

    subgraph "Kid joins family"
        F["Kid enters invite code<br/>e.g. 'X7K2MP'"] --> G["POST /api/families/join"]
        G --> H{Code valid?}
        H -- No --> I["404 Family not found"]
        H -- Yes --> J{Already a member?}
        J -- Yes --> K["409 Already in family"]
        J -- No --> L["Add kid to family<br/>role = 'kid'"]
        L --> M["Kid can now see<br/>family habits and earn sats!"]
    end

    E -. "Shares code<br/>via text, QR, etc." .-> F

    style E fill:#4CAF7D,color:#fff
    style M fill:#4CAF7D,color:#fff
    style I fill:#EE5A5A,color:#fff
    style K fill:#EE5A5A,color:#fff
```

## Leaving a Family

```mermaid
flowchart TD
    A["User clicks 'Leave Family'"] --> B["POST /api/families/leave"]
    B --> C{User is member?}
    C -- No --> D["404 Not Found"]
    C -- Yes --> E{User is a sponsor?}

    E -- No --> F["Remove kid from family"]
    E -- Yes --> G{Other sponsors<br/>exist in family?}
    G -- Yes --> F
    G -- No --> H{Other members<br/>exist?}
    H -- Yes --> I["400 Can't leave:<br/>you're the last sponsor!<br/>Promote someone first"]
    H -- No --> J["Remove user +<br/>deactivate all family habits +<br/>delete empty family"]

    F --> K["Check if family<br/>is now empty"]
    K --> L{Empty?}
    L -- Yes --> J
    L -- No --> M["Done"]

    style D fill:#EE5A5A,color:#fff
    style I fill:#EE5A5A,color:#fff
    style J fill:#FF9F43,color:#000
```

## Changing Roles

```mermaid
flowchart TD
    A["Sponsor selects member<br/>and new role"] --> B["PATCH /api/families/role<br/>{ family_id, user_id, role }"]
    B --> C{Requester is<br/>sponsor in family?}
    C -- No --> D["403 Forbidden"]
    C -- Yes --> E{Target is<br/>family member?}
    E -- No --> F["404 Member not found"]
    E -- Yes --> G{Demoting last<br/>sponsor to kid?}
    G -- Yes --> H["400 Can't demote:<br/>family needs at least 1 sponsor"]
    G -- No --> I["Update member role"]

    style D fill:#EE5A5A,color:#fff
    style F fill:#EE5A5A,color:#fff
    style H fill:#EE5A5A,color:#fff
    style I fill:#4CAF7D,color:#fff
```

## Invite code design

- 6 characters: uppercase letters + digits
- Excludes confusing characters: `0`, `1`, `I`, `O` (avoids 0/O and 1/I/l confusion)
- Alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 chars = ~1 billion combinations)

## Related flows

- [Registration & Login](./auth.md) - role is determined by family membership
- [Habit Lifecycle](./habit-lifecycle.md) - habits are scoped to families
