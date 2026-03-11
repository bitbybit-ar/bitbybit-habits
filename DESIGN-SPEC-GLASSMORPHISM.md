# BitByBit — Glassmorphism Dashboard Redesign

## Reference
Inspired by a Habit Tracker Glassmorphism UI (image saved by Ani). Adapted to our eye-safe warm palette.

## Layout Structure (both sponsor + kid dashboards)

```
┌─────────────────────────────────────┐
│ Navbar [frosted glass, fixed top]   │
│ Logo        LanguageSwitcher 🔔 ⚙️ 🚪│
├─────────────────────────────────────┤
│ Header [glass card]                 │
│ "Welcome, Name"       avatar        │
│ StatsBar (embedded in header card)  │
├─────────────────────────────────────┤
│ Tab Bar [glass, icon-only, fixed]   │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Scrollable Content Area         │ │
│ │ (glass cards inside)            │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│    margin-bottom: 100px desktop     │
│                   60px mobile       │
└─────────────────────────────────────┘
```

## Key Rules

### 1. NO ELEMENTS REMOVED
Every existing feature, button, data point, and interaction must be preserved. This is a visual/layout refactor only.

### 2. Shared Dashboard Layout
Create a shared `DashboardLayout` component used by BOTH sponsor and kid pages:
- Navbar (top): logo left, LanguageSwitcher + NotificationBell + Settings + Logout right
- Header card: welcome message + avatar + StatsBar
- Tab bar: icon-only with SVG icons from `components/icons/`
- Content area: fills remaining viewport height, scrolls independently
- No more BottomNav — tab bar is always at top, visible on all screen sizes

### 3. Glassmorphism Styling

**Glass mixin (SCSS):**
```scss
@mixin glass($opacity: 0.7, $blur: 16px) {
  background: rgba($color-surface-dark, $opacity);
  backdrop-filter: blur($blur);
  -webkit-backdrop-filter: blur($blur);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: $border-radius-lg;
}

@mixin glass-highlight {
  border: 1px solid rgba($color-primary, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

**Apply to:**
- Navbar: `@include glass(0.8, 20px)` — more opaque for readability
- Header card: `@include glass` + `@include glass-highlight`
- Tab bar: `@include glass(0.8, 20px)`
- Content cards (habit cards, family cards, forms, payment table): `@include glass`
- Empty states: keep transparent, text only

### 4. Tab Bar — Icon-Only with SVG Icons

**Sponsor tabs:**
| Tab | Icon | Component |
|-----|------|-----------|
| pending | `ClockIcon` | PendingList |
| habits | `ListIcon` | HabitCards grid |
| create | `PlusIcon` | CreateHabitForm |
| family | `UsersIcon` | FamilyCards |
| payments | `BoltIcon` | PaymentsTable |
| wallet | `WalletIcon` | WalletConnect |

**Kid tabs:**
| Tab | Icon | Component |
|-----|------|-----------|
| habits | `ListIcon` | HabitList |
| family | `UsersIcon` | FamilyCards + join form |

Active tab: gold underline or gold icon tint (`$color-primary`).
Badges: keep existing badge logic (pending count).

### 5. Content Area
- Height: `calc(100vh - navbar - header - tabbar - margin)`
- `overflow-y: auto` with custom scrollbar (thin, transparent)
- Bottom margin: `100px` desktop, `60px` mobile/tablet
- All content cards use glass styling with consistent padding

### 6. Responsive Behavior
- Tab bar: always horizontal, fixed, icon-only — works on all sizes
- Header card: stack vertically on mobile (welcome text above stats)
- Navbar: compact on mobile (smaller logo, icons only for settings/logout)
- Content cards: full width on mobile, max-width on desktop

### 7. Color Palette (DO NOT CHANGE)
Use existing `styles/_colors.scss`. Key glass colors:
- Glass bg: `rgba(36, 36, 66, 0.7)` (our `$color-surface-dark`)
- Glass border: `rgba(255, 255, 255, 0.08)`
- Highlight border: `rgba($color-primary, 0.15)`
- Active tab: `$color-primary` (#F7A825)

### 8. What Changes
- `app/[locale]/(dashboard)/layout.tsx` → new shared DashboardLayout with navbar + header + tabs
- `app/[locale]/(dashboard)/sponsor/page.tsx` → remove inline header/tabs/BottomNav, use layout
- `app/[locale]/(dashboard)/kid/page.tsx` → remove inline header/tabs/BottomNav, use layout
- SCSS: new `_glass.scss` mixin file, update dashboard styles
- `components/dashboard/bottom-nav/` → no longer used in dashboard (keep component, just remove from pages)

### 9. What Does NOT Change
- All API calls and data fetching
- All business logic (approve, reject, create, delete, etc.)
- All components (HabitCard, FamilyCard, PendingList, etc.) — only their wrapper styling
- All translations
- Auth flow, onboarding, routing
- Icons library (`components/icons/`)
