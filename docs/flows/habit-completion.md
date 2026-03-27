# Habit Completion by Kid

## Completion Flow

```mermaid
flowchart TD
    A["Kid taps habit card<br/>to mark as complete"] --> B["POST /api/completions<br/>{ habit_id, note?, evidence_url? }"]
    B --> C{Habit exists<br/>and kid has access?}
    C -- No --> D["404 Not Found"]
    C -- Yes --> E{Habit is active?}
    E -- No --> F["400 Habit is inactive"]
    E -- Yes --> G{Already completed<br/>today?}
    G -- Yes --> H["409 Already completed today"]
    G -- No --> I{verification_type?}

    I -- "self_verify" --> J["status = 'approved'<br/>(auto-approved instantly!)"]
    I -- "sponsor_approval" --> K["status = 'pending'<br/>(needs sponsor review)"]
    K --> L["Notify all sponsors<br/>in the family:<br/>'Kid completed Habit!'"]

    J --> M["Return completion record"]
    L --> M

    style D fill:#EE5A5A,color:#fff
    style F fill:#EE5A5A,color:#fff
    style H fill:#EE5A5A,color:#fff
    style J fill:#4CAF7D,color:#fff
    style K fill:#F7A825,color:#000
```

## One completion per day

The database enforces a unique constraint on `(habit_id, user_id, date)`. A kid can only complete each habit once per day, regardless of schedule type.

## What happens next?

- **If self-verified**: Completion is done. If the habit has a sat reward and the kid is in a family, payment would need to be triggered separately
- **If sponsor approval**: All sponsors in the family get a notification. The sponsor can then approve or reject from their dashboard

## Related flows

- [Payment Cascade](./payment-cascade.md) - what happens when a sponsor approves
- [Notifications](./notifications.md) - how sponsors get notified
- [Habit Lifecycle](./habit-lifecycle.md) - habit schedule and verification types
