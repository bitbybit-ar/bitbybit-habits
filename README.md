# BitByBit

**[bitbybit.com.ar](https://bitbybit.com.ar)**

A habit tracker powered by Bitcoin Lightning that rewards task completion with real sats.

**MVP: "Mesada 2.0"** — Sponsors (parents/guardians) create habits with sat rewards. Kids complete them and earn Bitcoin instantly via Lightning Network.

## How It Works

```
Sponsor creates family → generates invite code
Kid joins with code → connects Lightning wallet (NWC)
Sponsor creates habit ("Make the bed", 50 sats, verification: sponsor approval)
Kid completes task → status = "pending"
Sponsor approves → payment cascade triggers automatically
```

### Lightning Payment Flow

When a sponsor approves a completion with a sat reward, BitByBit runs through a payment cascade:

1. **WebLN Extension** — If the sponsor has Alby or another WebLN-compatible extension, payment is instant in-browser
2. **NWC Auto-pay** — If the sponsor has a connected NWC wallet, the server pays the kid's invoice automatically
3. **Invoice Modal** — QR code displayed for manual payment from any Lightning wallet (polls every 4s for settlement)
4. **Graceful fallback** — If neither party has a wallet, the completion is approved and payment stays pending

The kid receives sats directly to their own Lightning wallet via NWC-generated invoices.

## Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16, React 19, TypeScript (strict mode) |
| **Styles** | SCSS Modules with glassmorphism design system — dark theme default (eye safety for kids) |
| **i18n** | next-intl with `[locale]` routing (Spanish default, English) |
| **Database** | Neon DB (PostgreSQL serverless) via Drizzle ORM |
| **Auth** | Email/username + password (bcryptjs, JWT sessions). 2FA with TOTP. Nostr login coming soon |
| **Lightning** | NWC (Nostr Wallet Connect) via `@getalby/sdk`. WebLN browser extension support |
| **Encryption** | AES-256-GCM for wallet NWC URLs at rest |
| **API Docs** | OpenAPI 3.0 (Swagger) at `/api-docs` |
| **Testing** | Vitest + Testing Library (147 tests across 27 test files) |
| **Icons** | Custom SVGs in `components/icons/` (no external icon libraries) |

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
# Edit .env.local with your values (see below)

# Create database tables
# Run setup-database.sql against your Neon DB

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon DB PostgreSQL connection string |
| `AUTH_SECRET` | Yes | JWT signing key. Generate: `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Yes | AES-256 key for NWC URL encryption. Generate: `openssl rand -base64 32` |

## Project Structure

```
bitbybit-habits/
  app/
    [locale]/                  # i18n routes (es, en)
      (auth)/                  # Login, Register
      (dashboard)/             # Kid & Sponsor dashboards
      demo/                    # Interactive demo (no signup needed)
    api/                       # 34 API routes (outside [locale])
      auth/                    # login, register, logout, session, profile, 2fa/*
      completions/             # CRUD, approve, reject, pending
      families/                # CRUD, join, leave, role, stats, completions
      habits/                  # CRUD, assignments
      payments/                # list, invoice, [id]/pay, [id]/status, retry
      wallets/                 # CRUD, balance
      notifications/           # list, mark read
      stats/                   # user stats & streaks
  components/
    icons/                     # Custom SVG React components
    layout/                    # Navbar, Footer
    ui/                        # Reusable: Button, Card, Toast, InvoiceModal, etc.
    dashboard/                 # StatsBar, HabitCard, WeeklyTracker, WalletConnect, etc.
  lib/
    api/                       # apiHandler wrapper, errors, validation
    db/                        # Drizzle ORM schema & connection
    hooks/                     # useWebLN (extension detection)
    auth.ts                    # JWT session management
    crypto.ts                  # AES-256-GCM encryption for wallet URLs
    types.ts                   # Shared TypeScript interfaces
  messages/                    # Translation files (es.json, en.json)
  styles/                      # SCSS variables, mixins, glassmorphism system
  tests/                       # 27 test files, 147 tests
    api/                       # API endpoint tests
    components/                # Component tests
    helpers/                   # Test utilities
  docs/
    openapi.yaml               # OpenAPI 3.0 spec
  setup-database.sql           # Database schema (8 tables)
```

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run all tests (Vitest)
npm run test:watch   # Tests in watch mode
npm run test:coverage # Tests with coverage report
npx tsc --noEmit     # Type-check without compiling
```

## Data Model

```
Users ──┬── FamilyMembers ──── Families
        │
        ├── Habits ──── Completions ──── Payments
        │
        ├── Wallets (NWC, encrypted at rest)
        │
        └── Notifications
```

- **User** — has role (sponsor/kid), belongs to Families via FamilyMembers
- **Family** — group with invite_code, created by a sponsor
- **Habit** — created by sponsor, assigned to kid(s), has sat_reward and schedule
- **Completion** — kid marks as done, sponsor approves/rejects
- **Payment** — Lightning payment record (pending/paid/failed) with BOLT11 invoice and payment hash
- **Wallet** — NWC connection for sponsors AND kids (encrypted NWC URL stored with AES-256-GCM)
- **Notification** — in-app notifications for completions, approvals, and payments

## API

34 endpoints across 8 resource groups. Interactive Swagger UI at `/api-docs`.

| Group | Endpoints | Description |
|---|---|---|
| Auth | 9 | Register, login, logout, session, profile, 2FA setup/confirm/validate/disable |
| Habits | 4 | CRUD + multi-kid assignments |
| Completions | 4 | Create, list, approve, reject |
| Families | 8 | Create, join, leave, delete, members, roles, stats, completions |
| Payments | 5 | List, generate invoice, pay, check status, retry |
| Wallets | 4 | Connect, disconnect, get, balance |
| Stats | 1 | User stats with streaks |
| Notifications | 1 | List with read status |

Full OpenAPI 3.0 spec in [`docs/openapi.yaml`](docs/openapi.yaml).

## Security

- Passwords hashed with bcryptjs (10 salt rounds)
- JWT sessions in httpOnly cookies (7-day expiry)
- NWC wallet URLs encrypted at rest with AES-256-GCM
- Optional TOTP-based 2FA
- SQL injection prevention via Drizzle ORM parameterized queries
- Account lockout after failed login attempts

## Hackathon

Built for **FOUNDATIONS** — Lightning Hackathon #1 by [La Crypta](https://hackaton.lacrypta.ar).

- **Theme**: Lightning Payments Basics
- **Dates**: March 2026
- **Prize**: 1,000,000 sats distributed among 6 winners
- **Evaluation**: AI-judged

### What we built for FOUNDATIONS

The core Lightning payment flow — the complete path from task completion to sats arriving in a kid's wallet:

- NWC wallet integration for both sponsors and kids
- Invoice generation via kid's NWC wallet (`makeInvoice`)
- Multi-strategy payment: WebLN extension, NWC auto-pay, QR invoice modal
- Real-time payment status polling via `lookupInvoice`
- Wallet balance display
- Graceful degradation when wallets aren't connected

## Team

| Name | Role |
|---|---|
| **Anix** ([@analiaacostaok](https://github.com/analiaacostaok)) | Dev & team wrangler |
| **Llopo** ([@fabricio333](https://github.com/fabricio333)) | The bitcoiner of the family. Licensed vibe coder |
| **Wander** ([@Pizza-Wder](https://github.com/Pizza-Wder)) | Licensed in "My grandma can use it" & tester |
| **Leon** ([@leonacostaok](https://github.com/leonacostaok)) | Consultant & pitch specialist |

## License

ISC
