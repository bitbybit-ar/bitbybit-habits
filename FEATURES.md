# BitByBit — Feature Catalog

> Last updated: 2026-03-28

## Status Legend

- **Working** — Fully implemented and tested
- **Partial** — Core functionality works, some sub-features incomplete
- **Stub** — Infrastructure exists but functionality is minimal
- **Pending** — Planned but not yet implemented
- **Commented** — Code exists but is commented out for MVP simplification

---

## Authentication

| Feature | Status | Notes |
|---------|--------|-------|
| Email registration | Working | bcryptjs hashing, username + email + password |
| Email login | Working | JWT sessions via httpOnly cookie |
| Account lockout | Working | Configurable failed attempts threshold, timed cooldown |
| Rate limiting | Working | IP-based sliding window on login endpoint |
| Nostr NIP-42 auth | Working | Challenge-response login with browser extension (NIP-07) |
| Nostr registration | Working | Create account from Nostr pubkey |
| Nostr link/unlink | Working | Link existing account to Nostr identity |
| Nostr metadata sync | Working | Fetch NIP-01 kind 0 metadata from relays |
| TOTP 2FA setup | Working | Generate secret + QR code |
| TOTP 2FA validation | Working | Validate code during login flow |
| TOTP 2FA disable | Working | Remove 2FA from account |
| Recovery codes | Partial | Generated and stored in DB, redemption flow not wired |
| Dev login | Working | Development-only endpoint for testing |

## Families

| Feature | Status | Notes |
|---------|--------|-------|
| Create family | Working | Auto-generates 6-char invite code, creator is sponsor |
| Join family | Working | Via invite code, joins as kid role |
| Leave family | Working | Sponsor blocked if other members exist; auto-deletes empty families |
| Delete family | Working | Creator-only, deactivates related habits |
| Member management | Working | Sponsor can remove members |
| Invite code sharing | Working | Copy to clipboard in family card |
| Multi-family per user | Commented | Users limited to one family (MVP). Code preserved with `// ROADMAP:` |
| Multi-sponsor per family | Commented | One sponsor per family (MVP). Role toggle UI hidden, promotion API blocked |
| Role change (kid↔sponsor) | Commented | API blocks promotion; demotion blocked for only sponsor |

## Habits

| Feature | Status | Notes |
|---------|--------|-------|
| Create habit | Working | Name, description, color, sat reward, schedule, verification type |
| Edit habit | Working | Inline edit modal in sponsor dashboard |
| Delete habit | Working | Creator/sponsor only |
| List habits | Working | Filters: family_id, assigned_to, active; pagination support |
| Schedule: daily | Working | Habit expected every day |
| Schedule: specific days | Working | Select specific days of the week |
| Schedule: times per week | Working | N times per week, any days |
| Multi-kid assignment | Working | Assign same habit to multiple kids (creates one record per kid) |
| Color picker | Working | 8 preset colors |
| Verification: sponsor_approval | Working | Default and primary verification type |
| Verification: self_verify | Partial | Exists in schema and form, but no distinct behavior in completion flow |
| Verification: bot_verify | Stub | Exists in schema only, no implementation |
| Icon selection | Pending | Field exists in schema but no icon picker UI |
| Habit templates | Pending | No preset habits or templates |

## Completions

| Feature | Status | Notes |
|---------|--------|-------|
| Mark habit complete | Working | Kid submits completion, one per habit per day |
| Approve completion | Working | Sponsor approves, triggers payment cascade |
| Reject completion | Working | Sponsor rejects with optional note |
| Pending completions list | Working | Sponsor sees all pending across family |
| Weekly tracker | Working | 7-day visual grid showing completion status per day |
| Evidence URL | Stub | Field exists in schema and API, not used in UI |
| Completion notes | Working | Optional notes on completion |

## Payments & Lightning

| Feature | Status | Notes |
|---------|--------|-------|
| Invoice generation (NWC) | Working | BOLT11 invoice from kid's NWC wallet |
| WebLN auto-pay (Tier 1) | Working | Browser extension pays instantly |
| NWC auto-pay (Tier 2) | Working | Server-side payment via sponsor's NWC wallet |
| QR invoice modal (Tier 3) | Working | Fallback with QR code + copy + polling |
| Payment status tracking | Working | pending / paid / failed states |
| Payment retry | Working | Reset failed payment and re-run cascade |
| Payment history | Working | Filterable by role, status, date range |
| Insufficient funds handling | Working | Specific error for NWC insufficient balance |
| Payment method tracking | Working | Records whether paid via webln, nwc, or manual |

## Wallets

| Feature | Status | Notes |
|---------|--------|-------|
| NWC wallet connection | Working | nostr+walletconnect:// URL |
| Wallet encryption | Working | AES-256-GCM encryption of stored NWC URLs |
| Balance check | Working | Via NWC get_balance |
| Wallet disconnect | Working | Deactivate wallet |
| Wallet label | Working | Custom label for wallet |
| Multiple wallets | Partial | Schema supports multiple, UI shows only active one |

## Notifications

| Feature | Status | Notes |
|---------|--------|-------|
| Notification bell + badge | Working | Unread count in navbar |
| Notification list | Working | Dropdown with all notifications |
| Mark as read | Working | Individual notification marking |
| Auto-polling | Working | 30-second interval for new notifications |
| Event triggers | Partial | Infrastructure works, but not all events create notifications |

## Stats & Gamification

| Feature | Status | Notes |
|---------|--------|-------|
| Total sats earned | Working | Aggregated from paid completions |
| Best streak | Working | Longest consecutive days of approved completions |
| Pending count | Working | Number of awaiting-approval completions |
| Level system | Working | floor(totalSats / 100) + 1, displayed on kid dashboard |
| Stats bar (kid) | Working | Total sats, best streak, pending count |
| Summary bar (sponsor) | Working | Completed today, total today, pending, total sats paid |
| Sats animation | Working | Floating +sats animation when completion is approved |
| Animated number counters | Working | Stats bar animations |

## Demo Mode

| Feature | Status | Notes |
|---------|--------|-------|
| Sponsor demo | Working | 4-step interactive walkthrough, no auth required |
| Kid demo | Working | 3-step interactive walkthrough, no auth required |
| Role selector | Working | Flip card UI to choose demo role |

## Admin Panel

| Feature | Status | Notes |
|---------|--------|-------|
| Admin access control | Working | Hardcoded admin pubkey check |
| User management table | Working | Paginated, searchable, sortable |
| Admin stats | Working | System-wide statistics |
| Nostr metadata sync (admin) | Working | Force sync user metadata from relays |

## Settings

| Feature | Status | Notes |
|---------|--------|-------|
| Edit profile | Working | Display name, username, email, avatar URL |
| Locale selection | Working | Spanish / English |
| Nostr identity management | Working | Link/unlink, sync metadata, auto-publish |
| Password change | Pending | Not implemented |
| Account deletion | Pending | Not implemented |

## Internationalization

| Feature | Status | Notes |
|---------|--------|-------|
| Spanish (es) | Working | Default language, full coverage |
| English (en) | Working | Full coverage |
| Locale routing | Working | /es/, /en/ URL segments |
| Locale switcher | Working | In navbar |
| User locale preference | Working | Saved in profile, used for redirects |

## API Documentation

| Feature | Status | Notes |
|---------|--------|-------|
| OpenAPI 3.0 spec | Working | docs/openapi.yaml |
| Swagger UI | Working | Interactive API explorer at /api-docs |

## Onboarding

| Feature | Status | Notes |
|---------|--------|-------|
| Role selection | Working | Sponsor or Kid path |
| Family creation (sponsor) | Working | Create family with invite code |
| Family join (kid) | Working | Join with invite code |
| Welcome walkthrough | Working | 3 tips per role with skip option |
| Dashboard onboarding | Working | First-visit onboarding card in dashboard |
