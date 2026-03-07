# BitByBit

🌐 **[bitbybit.com.ar](https://bitbybit.com.ar)**

A habit tracker powered by Bitcoin Lightning that rewards task completion with real sats.

**MVP: "Mesada 2.0"** — Sponsors (parents/guardians) create habits with sat rewards. Kids complete them and earn sats instantly via Lightning Network.

## How It Works

```
Sponsor creates family → generates invite code
Kid joins with code
Sponsor creates habit ("Make the bed", 50 sats, verification: sponsor approval)
Kid completes task → status = "pending"
Sponsor approves → sats paid via NWC (Lightning)
```

## Stack

- **Framework**: Next.js 16, React 19, TypeScript (strict)
- **Styles**: SCSS Modules — dark theme by default
- **i18n**: next-intl with `[locale]` routing (Spanish default, English)
- **Database**: Neon DB (PostgreSQL serverless)
- **Auth**: Email/username + password (bcryptjs). Nostr login coming soon
- **Lightning**: NWC via `@getalby/sdk`
- **API Docs**: OpenAPI 3.0 (Swagger) at `/api-docs`
- **Icons**: Custom SVGs in `components/icons/`

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon DB](https://neon.tech) database
- (Optional) An [Alby](https://getalby.com) NWC connection string for Lightning payments

### Setup

```bash
# Clone
git clone https://github.com/bitbybit-ar/bitbybit-habits.git
cd bitbybit-habits

# Install dependencies
npm install

# Environment variables
cp .env.example .env.local
# Edit .env.local with your Neon DB connection string

# Create database tables
# Run setup-database.sql against your Neon DB

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon DB connection string |
| `NWC_URL` | (Optional) Nostr Wallet Connect URL for Lightning payments |

## Project Structure

```
bitbybit-habits/
  app/
    [locale]/              # i18n routes (es, en)
      (auth)/              # Login, Register
      (dashboard)/         # Kid dashboard, Sponsor dashboard
      Hero/, HowItWorks/   # Landing page sections
    api/                   # API routes (outside [locale])
  components/
    icons/                 # Custom SVG React components
    layout/                # Navbar, Footer
    ui/                    # Reusable components (Button, Card, etc.)
    dashboard/             # Dashboard components (StatsBar, HabitCard, etc.)
  i18n/                    # next-intl config
  lib/                     # Utils, types, auth, db
  messages/                # Translation files (es.json, en.json)
  styles/                  # SCSS variables, mixins, globals
  docs/
    openapi.yaml           # OpenAPI 3.0 spec
  setup-database.sql       # Database schema
```

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type-check
```

## Data Model

- **User** — has role (sponsor/kid), belongs to a Family
- **Family** — group with invite_code, created by a sponsor
- **Habit** — created by sponsor, assigned to kid, has sat_reward
- **Completion** — kid marks as done, sponsor approves/rejects
- **Payment** — Lightning payment record on approval
- **Wallet** — NWC connection for the sponsor

## API Documentation

Interactive Swagger UI available at `/api-docs` when the dev server is running.

Full spec in `docs/openapi.yaml`.

## Hackathon

Built for **FOUNDATIONS** — Lightning Hackathon #1 by [La Crypta](https://hackaton.lacrypta.ar).

## Team

| Name | Role |
|---|---|
| **Anix** ([@analiaacostaok](https://github.com/analiaacostaok)) | Dev & team wrangler |
| **Llopo** ([@fabricio333](https://github.com/fabricio333)) | The bitcoiner of the family. Licensed vibe coder |
| **Wander** ([@Pizza-Wder](https://github.com/Pizza-Wder)) | Licensed in "My grandma can use it" & tester |
| **Leon** ([@leonacostaok](https://github.com/leonacostaok)) | Consultant & pitch specialist |

## License

ISC
