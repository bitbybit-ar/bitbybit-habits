# BitByBit — Demo Page Redesign

## Current Issues
- Title overlapped by navbar (missing padding-top — global layout issue)
- 4 cards (2 explainer + 2 action) are redundant — merge into 2
- Top cards bigger than bottom cards — inconsistent sizing
- Emojis instead of SVG icons
- No glassmorphism styling

## New Design

### Layout Fix
The demo page uses `<Navbar />` but the `.demoPage` container doesn't account for navbar height. Add `padding-top` to clear the fixed navbar. This should be handled globally for ALL pages using the Navbar component (check if other pages like landing have the same issue).

### 2 Cards Only — One Per Role

Merge the explainer cards (`.rolesExplainer`) and action cards (`.roles`) into **2 single cards**. Each card contains:
- **SVG icon** (not emoji) — use existing icons from `components/icons/`: shield-like for Sponsor, bolt for Kid
- **Role name** (Sponsor / Kid)
- **Short description** (1-2 lines, merge the explainer + action descriptions)
- **"Ver demo" button** — gold gradient button (`$gradient-primary`), not the whole card as a link

### 3D Card Flip (Desktop Only)

**Front face:**
- Glass card (`@include glass-card` + `@include glass-hover`)
- SVG icon + role name + description + "Ver demo →" button

**Back face (revealed on hover):**
- Screenshot/preview image of that role's dashboard as background
- Dark glass overlay: `rgba($color-surface-dark, 0.6)` + `backdrop-filter: blur(4px)`
- "Ver demo →" button centered, gold gradient, prominent

**CSS approach:**
```scss
.flipCard {
  perspective: 1000px;
  // Fixed height — same for both cards
}
.flipCardInner {
  transition: transform 0.6s ease;
  transform-style: preserve-3d;
  position: relative;
  width: 100%;
  height: 100%;
}
.flipCard:hover .flipCardInner {
  transform: rotateY(180deg);
}
.flipFront, .flipBack {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
}
.flipBack {
  transform: rotateY(180deg);
  // Screenshot bg + glass overlay
}
```

### Mobile — NO Flip

On mobile (`@include mobile`):
- **No flip animation** — just show front face
- Cards stack **vertically**
- Each card must be **max ~45vh** so both are visible without scrolling
- Compact content: smaller icon, shorter text, smaller button
- Content must fit without overflow — reduce padding/font-size if needed

```
Mobile layout (no scroll needed):
┌─────────────────────┐
│ Navbar              │
│                     │
│ Probá BitByBit      │
│ Subtitle (1 line)   │
│                     │
│ ┌─────────────────┐ │
│ │ 🛡 Sponsor      │ │
│ │ Short desc      │ │
│ │ [Ver demo]      │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ ⚡ Kid           │ │
│ │ Short desc      │ │
│ │ [Ver demo]      │ │
│ └─────────────────┘ │
└─────────────────────┘
```

### Desktop layout
- 2 cards side by side (`grid-template-columns: 1fr 1fr`)
- Same height (enforced by grid)
- Max-width ~700px centered
- Flip on hover

### Hover Effects (Desktop)
- **Sponsor card**: border glow `rgba($color-primary, 0.2)` (gold)
- **Kid card**: border glow `rgba($color-accent-alt, 0.2)` (teal)
- Smooth scale on hover before flip: `transform: scale(1.02)`

### Screenshots for Back Face
- Generate or capture 2 static images: `public/images/demo-sponsor-preview.jpg` and `public/images/demo-kid-preview.jpg`
- If real screenshots aren't available, create placeholder gradient cards with text "Dashboard Preview" and the role's color scheme
- These can be replaced later with real screenshots

### SVG Icons
- Use `BoltIcon` for Kid (already exists)  
- For Sponsor, use `UsersIcon` or create a simple shield SVG if needed
- NO emojis anywhere on this page

### What to Remove
- `.rolesExplainer` section (merged into the 2 cards)
- All emoji icons (replaced with SVG)

### What to Keep
- Page title + subtitle (with gradient text)
- Navigation to `/demo/sponsor` and `/demo/kid` (via the buttons)
- All translations (update keys if needed, but keep i18n)
- Navbar component

### Files to Modify
- `app/[locale]/demo/page.tsx` — restructure to 2 flip cards
- `app/[locale]/demo/demo.module.scss` — new styles, remove old
- Possibly `components/layout/navbar/` — check if global padding fix is needed
- `public/images/` — add preview screenshots (or placeholders)
