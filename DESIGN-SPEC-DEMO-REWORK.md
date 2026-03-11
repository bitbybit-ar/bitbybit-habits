# BitByBit — Demo Pages Full Rework (Real Components)

## Goal
Replace the custom mock UI in the demo sponsor/kid pages with the REAL dashboard components + DashboardLayout, fed with mock data. The demo should look and feel exactly like the real app with the new glassmorphism design.

## Current State
- `components/demo/SponsorDemo/` — custom step-by-step using `Card`, `Button`, `DemoStepper`, inline forms
- `components/demo/KidDemo/` — same approach, custom habit cards, custom badges
- These do NOT use `HabitCard`, `FamilyCard`, `StatsBar`, `PendingList`, `CreateHabitForm`, `DashboardLayout`, etc.

## New Approach

### Keep the DemoStepper concept BUT render real components inside each step

The stepper guides the user through the flow, but each step shows the ACTUAL dashboard components with mock data. This way users see exactly what the real app looks like.

### Sponsor Demo Steps (using real components):

**Step 1 — Create Family**
- Show `CreateHabitForm` is NOT used here. Instead show a simplified family creation form (glass-styled).
- On "create", show a `FamilyCard` component with mock data: `{ name: "Familia Nakamoto", invite_code: "BIT-7K3M", members: [{ display_name: "Mamá", role: "sponsor" }] }`

**Step 2 — Invite Kid**
- Show the `FamilyCard` with the invite code prominently displayed
- Mock a kid joining: add `{ display_name: "Satoshi Jr.", role: "kid" }` to members

**Step 3 — Create Habit**
- Show `CreateHabitForm` component with mock family/kid data
- On submit, show a `HabitCard` with the created habit mock data

**Step 4 — Approve Completion**
- Show `PendingList` component with a mock pending completion
- Use real `onApprove` / `onReject` handlers (local state only)

**Step 5 — Sats Sent**
- Show `StatsBar` with mock stats (500 sats paid, 1 habit, 0 pending)
- Show celebration + register CTA

### Kid Demo Steps (using real components):

**Step 1 — Join Family**
- Glass-styled form with invite code input
- On join, show `FamilyCard` with mock family data

**Step 2 — View Habits**
- Show `HabitCard` components with mock habits (3 habits with different sat rewards)
- Use real component props, `hideAction` for view-only initially

**Step 3 — Complete Habits**
- Same `HabitCard` components but with `onComplete` enabled
- Track completions in local state

**Step 4 — Pending Approval**
- Show habits with pending status badges (use real HabitCard completion states)

**Step 5 — Sats Earned**
- Show `StatsBar` with mock stats (total sats, streak, etc.)
- Celebration + register CTA

### Layout
- Wrap demo pages in a modified `DashboardLayout` (or a `DemoLayout` that reuses the same glass navbar/header/tabs visually but without auth)
- The header should show "Demo Mode" badge
- Tabs should be visible but non-interactive (just showing the current step's tab highlighted)
- Glass styling on everything

### Key Rules
1. **Import and use REAL dashboard components** — `HabitCard`, `FamilyCard`, `StatsBar`, `PendingList`, `CreateHabitForm`, `WalletConnect` (where applicable)
2. **Mock data only** — no API calls, all state is local
3. **Keep DemoStepper** for navigation between steps (but apply glass styling to it too)
4. **Keep all translations** — reuse existing i18n keys, add new ones if needed
5. **Apply glassmorphism** everywhere — stepper dots, step content, nav buttons
6. **Replace ALL emojis** with SVG icons from `components/icons/`
7. **Keep the links** between sponsor demo ↔ kid demo and the register CTA

### Files to Modify
- `components/demo/SponsorDemo/index.tsx` — full rewrite using real components
- `components/demo/KidDemo/index.tsx` — full rewrite using real components  
- `components/demo/DemoStepper/index.tsx` — apply glass styling, replace emoji checkmark with `CheckIcon`
- `components/demo/DemoStepper/demo-stepper.module.scss` — glass styles
- `app/[locale]/demo/sponsor/page.tsx` — may need layout wrapper adjustments
- `app/[locale]/demo/kid/page.tsx` — same
- `components/demo/MockForm/` — can be removed or simplified (replaced by real components)
- Any SCSS in `components/demo/` — update to glass styles

### Build & Test
- `npm run build` must succeed
- `npx vitest run` — all tests must pass
- Verify that the real components work with mock data (no API calls triggered)
