# Notification System

## How Notifications Flow

```mermaid
flowchart LR
    subgraph "Events that create notifications"
        A["Kid completes habit"] --> N1["completion_pending<br/>sent to all family sponsors"]
        B["Sponsor approves"] --> N2["completion_approved<br/>sent to kid"]
        C["Sponsor rejects"] --> N3["completion_rejected<br/>sent to kid"]
        D["Payment received"] --> N4["payment_received<br/>sent to kid"]
    end

    subgraph "Notification record"
        N1 --> DB["notifications table:<br/>id, user_id, type, title,<br/>body, read, metadata, created_at"]
        N2 --> DB
        N3 --> DB
        N4 --> DB
    end

    subgraph "Reading notifications"
        DB --> GET["GET /api/notifications<br/>?unread=true"]
        GET --> UI["Show in dashboard<br/>with badge count"]
        UI --> PATCH["PATCH /api/notifications<br/>{ id } -> read = true"]
    end
```

## Notification types

| Type | Triggered by | Sent to | Contains |
|------|-------------|---------|----------|
| `completion_pending` | Kid completes habit | All family sponsors | Kid name, habit name |
| `completion_approved` | Sponsor approves | Kid | Habit name, sat reward |
| `completion_rejected` | Sponsor rejects | Kid | Habit name, rejection reason |
| `payment_received` | Payment settles | Kid | Amount in sats |

## API

- **GET** `/api/notifications?unread=true` - Fetch notifications (max 50, newest first)
- **PATCH** `/api/notifications` `{ id }` - Mark a notification as read

## Related flows

- [Habit Completion](./habit-completion.md) - triggers `completion_pending`
- [Payment Cascade](./payment-cascade.md) - triggers `completion_approved` and `payment_received`
