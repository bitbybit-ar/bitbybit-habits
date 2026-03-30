# BitByBit — Roadmap

> Last updated: 2026-03-28

## Current State: MVP (v1.x)

Single-family, single-sponsor mode. Core habit tracking with Lightning payments via NWC and WebLN. Full auth flow (email + Nostr + 2FA). Sponsor and kid dashboards. Spanish + English i18n.

See [FEATURES.md](./FEATURES.md) for the complete feature catalog with status.

---

## Phase 0: Auth Improvements (v1.0.x)

Priority: **High** — Extend Nostr login before expanding scope.

- [ ] **Remote signing login (NIP-46)** — Allow users to sign in using a remote signer (nsecBunker, Amber, etc.) via NIP-46. Currently only NIP-07 browser extension is supported. This unlocks mobile users and hardware signers without exposing the private key to the browser.

---

## Phase 1: Foundation Hardening (v1.1)

Priority: **High** — Polish the MVP before expanding scope.

- [ ] Recovery code redemption flow (codes are generated but can't be used yet)
- [ ] Evidence URL upload for completions (field exists, no UI)
- [ ] Notification triggers for all key events (completion created, approved, paid, rejected)
- [ ] Password change in settings
- [ ] Account deletion flow
- [ ] Icon picker for habits (field exists in schema)
- [ ] Distinct behavior for `self_verify` verification type
- [ ] Fix pre-existing merge conflict markers in navbar component
- [ ] Improve error feedback on payment failures

## Phase 2: Multi-Family Support (v2.0)

Priority: **Medium** — Re-enable commented code + add UI for family selection.

All multi-family code is preserved in the codebase with `// ROADMAP: Multi-family support` comments.

- [ ] Remove single-family guard from `POST /api/families` and `POST /api/families/join`
- [ ] Restore multi-family aggregation in `useFamilyData.ts`
- [ ] Restore multi-family kid flattening + dedup in sponsor dashboard
- [ ] Add family selector dropdown in create-habit-form (restore `families` prop)
- [ ] Show join-family form for kids already in a family
- [ ] Cross-family stats aggregation in summary bar
- [ ] Family-scoped habit filtering in dashboards
- [ ] Per-family stats views

## Phase 3: Multi-Sponsor Support (v2.1)

Priority: **Medium** — Re-enable after multi-family is stable.

All multi-sponsor code is preserved with `// ROADMAP: Multi-sponsor support` comments.

- [ ] Remove `single_sponsor_only` guard from `PATCH /api/families/role`
- [ ] Restore `otherSponsors` query in leave/role endpoints
- [ ] Restore role toggle button in family-card UI
- [ ] Restore `onRoleChange` prop chain (FamilyCard → SponsorFamilyTab → sponsor page)
- [ ] Add last-sponsor protection with multi-sponsor awareness

## Phase 4: Advanced Habits (v3.0)

Priority: **Low** — Expand habit functionality.

- [ ] Bot verification (`bot_verify` type — automated completion checks)
- [ ] Habit templates / presets (common habits like "Brush teeth", "Make bed")
- [ ] Habit categories and tags
- [ ] Recurring reward schedules (increasing rewards for streaks)
- [ ] Habit streaks with bonus sats rewards
- [ ] Habit archiving (soft-delete with history)

## Phase 5: Social & Engagement (v3.1)

Priority: **Low** — Gamification and retention features.

- [ ] Family leaderboard (sats earned, streaks, completions)
- [ ] Achievement badges (first completion, 7-day streak, 100 sats, etc.)
- [ ] Push notifications (web push / PWA)
- [ ] Weekly summary emails
- [ ] Share achievements on Nostr

## Phase 6: Platform Growth (v4.0)

Priority: **Future** — Expand beyond family use case.

- [ ] Teacher/classroom mode (sponsor variant for schools)
- [ ] Public habit challenges (community features)
- [ ] API key authentication for third-party integrations
- [ ] Mobile app (React Native or PWA enhancement)
- [ ] RTL language support
- [ ] Additional languages beyond Spanish/English

---

## Commented Code Index

Quick reference for where multi-family/multi-sponsor code is commented out:

| File | What's Commented | Tag |
|------|-----------------|-----|
| `app/api/families/role/route.ts` | `otherSponsors` query for multi-sponsor demotion check | `Multi-sponsor support` |
| `app/api/families/leave/route.ts` | Nested `otherSponsors` + `otherMembers` check | `Multi-sponsor support` |
| `lib/hooks/useFamilyData.ts` | Multi-family parallel fetch loop | `Multi-family support` |
| `app/[locale]/(dashboard)/sponsor/page.tsx` | Multi-family flatMap + dedup + `handleRoleChange` | Both |
| `components/dashboard/family-card/index.tsx` | Role toggle button + `handleRoleToggle` + `onRoleChange` prop | `Multi-sponsor support` |
| `components/dashboard/create-habit-form/index.tsx` | Family selector dropdown + `FamilyOption` interface | `Multi-family support` |
| `components/dashboard/sponsor/SponsorFamilyTab.tsx` | `onRoleChange` prop in interface | `Multi-sponsor support` |
| `components/dashboard/sponsor/SponsorHabitsTab.tsx` | `families.flatMap` member lookup + multi-family kid iteration | `Multi-family support` |
