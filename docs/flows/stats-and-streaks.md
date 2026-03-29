# Stats & Streaks

## How Stats Are Calculated

```mermaid
flowchart TD
    A["GET /api/stats"] --> B["Query 1: Total sats earned<br/>SUM payments WHERE<br/>to_user = me AND status = paid"]
    A --> C["Query 2: Pending completions<br/>COUNT completions WHERE<br/>user = me AND status = pending"]
    A --> D["Query 3: Streak per habit"]

    D --> E["Fetch all active habits<br/>assigned to me"]
    E --> F["For each habit:<br/>fetch approved completions<br/>sorted by date DESC"]
    F --> G["Calculate streak:<br/>start from today,<br/>walk backwards day by day"]
    G --> H{Completion exists<br/>for this day?}
    H -- Yes --> I["streak++ <br/>move to previous day"]
    I --> H
    H -- No --> J["Streak broken!<br/>Return count"]

    B --> K["Return KidStats"]
    C --> K
    J --> K

    K --> L["{ total_sats_earned: 1250,<br/>  pending_completions: 2,<br/>  streaks: [<br/>    { habit: 'Make bed', streak: 7 },<br/>    { habit: 'Read 20min', streak: 3 }<br/>  ] }"]

    style L fill:#F7A825,color:#000
```

## Streak calculation

Streaks count consecutive days of approved completions, starting from today and walking backwards:

1. Start at today's date
2. Check if there's an approved completion for this date
3. If yes: increment streak, move to previous day, repeat
4. If no: streak is broken, return the count

A streak of 0 means the kid didn't complete the habit today. A streak of 7 means 7 consecutive days including today.

## Response shape

```json
{
  "total_sats_earned": 1250,
  "pending_completions": 2,
  "streaks": [
    { "habit_id": "...", "habit_name": "Make bed", "current_streak": 7 },
    { "habit_id": "...", "habit_name": "Read 20min", "current_streak": 3 }
  ]
}
```

## Related flows

- [Habit Completion](./habit-completion.md) - completions feed into streaks
- [Payment Cascade](./payment-cascade.md) - payments feed into total sats
