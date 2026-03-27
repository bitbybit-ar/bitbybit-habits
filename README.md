# BitByBit

**[bitbybit.com.ar](https://bitbybit.com.ar)**

Kids earn real Bitcoin by building real habits.

BitByBit turns "la mesada" into a tool for financial education. Parents create habits with sat rewards, kids complete them and receive real Bitcoin instantly via Lightning Network. No pretend money, no delayed gratification — every completed task means sats in their wallet, teaching kids that earning is something they can do right now. **Mesada 2.0.**

## How It Works

1. **Create your family** — A parent signs up, creates a family, and shares the invite code
2. **Kids join** — Kids enter the code and connect their Lightning wallet
3. **Assign habits with rewards** — "Make the bed" = 50 sats, "Read 20 minutes" = 100 sats
4. **Kids complete, parents approve** — One tap to mark done, one tap to approve
5. **Sats arrive instantly** — Payment flows automatically to the kid's wallet via Lightning

The reward is real, instant, and theirs. That's what makes the habit stick.

## Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16, React 19, TypeScript (strict mode) |
| **Styles** | SCSS Modules with glassmorphism design system — dark theme default (eye safety for kids) |
| **i18n** | next-intl with `[locale]` routing (Spanish default, English) |
| **Database** | Neon DB (PostgreSQL serverless) via Drizzle ORM |
| **Auth** | Email/username + password (bcryptjs, JWT sessions). Optional TOTP 2FA. Nostr login coming soon |
| **Lightning** | NWC (Nostr Wallet Connect) via `@getalby/sdk`. WebLN browser extension support |
| **Encryption** | AES-256-GCM for wallet NWC URLs at rest |
| **API Docs** | OpenAPI 3.0 (Swagger) at `/api-docs` — 42 endpoints fully documented |
| **Testing** | Vitest + Testing Library (196 tests across 35 test files) |
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
      (auth)/                  # Login, Register (with loading.tsx, error.tsx)
      (dashboard)/             # Kid & Sponsor dashboards (with loading.tsx, error.tsx)
      demo/                    # Interactive demo (no signup needed)
      not-found.tsx            # Custom 404 page
      error.tsx                # Root error boundary
    api/                       # 34 API route files (outside [locale])
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
    ui/                        # Reusable: Form, Button, Toast, Skeleton, Spinner, InvoiceModal, etc.
    dashboard/                 # StatsBar, HabitCard, WeeklyTracker, WalletConnect, etc.
      sponsor/                 # Sponsor tab sub-components (HabitsTab, PaymentsTab, FamilyTab)
    demo/                      # Demo stepper, KidDemo, SponsorDemo
    auth/                      # AuthCard wrapper
  lib/
    api/                       # apiHandler wrapper, errors, validation
    db/                        # Drizzle ORM schema & connection
    hooks/                     # useSession, useHabits, useFamilies, usePayments, useStats, useFormValidation, useWebLN, etc.
    auth.ts                    # JWT session management with runtime payload validation
    crypto.ts                  # AES-256-GCM encryption for wallet URLs
    date.ts                    # Date formatting utilities (todayDateStr, formatDisplayDate)
    request.ts                 # IP extraction for rate limiting
    types.ts                   # Shared TypeScript interfaces
  messages/                    # Translation files (es.json, en.json)
  styles/                      # SCSS variables, mixins, glassmorphism system
  tests/                       # 35 test files, 196 tests
    api/                       # API endpoint tests (auth, habits, payments, families, etc.)
    components/                # Component tests
    helpers/                   # Test utilities
  docs/
    openapi.yaml               # OpenAPI 3.0 spec (42 endpoints)
  proxy.ts                     # Next.js 16 middleware (i18n routing + route protection)
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

## Troubleshooting

### Database connection fails

- Verify `DATABASE_URL` is a valid Neon DB connection string (starts with `postgresql://` or `postgres://`)
- Check that your Neon project is active (free tier pauses after inactivity)
- Run `setup-database.sql` against your database if tables don't exist

### Lightning payments not working

- Both sponsor AND kid need a connected wallet (NWC URL) for payments to work
- NWC URL must start with `nostr+walletconnect://`
- If invoices expire, use the retry button in the payments tab
- Ensure `ENCRYPTION_KEY` is set — NWC URLs are encrypted at rest and can't be read without it

### Auth issues

- If login fails repeatedly, the account locks after 10 attempts (30-minute cooldown)
- JWT sessions expire after 7 days — users need to log in again
- `AUTH_SECRET` must be at least 32 characters. Generate with: `openssl rand -base64 32`

### Build or type errors

- Run `npx tsc --noEmit` to check for type errors before building
- Delete `.next/` and `node_modules/.cache` if you see stale build errors
- Ensure Node.js 18+ is installed (`node --version`)

### i18n / translations

- All user-facing strings must exist in both `messages/es.json` and `messages/en.json`
- Missing keys will show the raw key path in the UI
- Spanish is the default locale; English is the fallback

### Tests failing

- Run `npm test` to check all tests (Vitest)
- Tests mock the database — no real DB connection needed
- If tests hang, check for port conflicts with `lsof -i :3000`

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

42 endpoints across 9 resource groups. Interactive Swagger UI at `/api-docs`.

| Group | Endpoints | Description |
|---|---|---|
| Auth | 10 | Register, login, logout, session, profile (GET/PATCH), 2FA setup/confirm/validate/disable |
| Habits | 5 | List (paginated), create, update, delete, assignments |
| Completions | 5 | Create, list, pending, approve, reject |
| Families | 8 | Create, join, leave, delete, members, roles, stats, completions |
| Payments | 5 | List (with role/date filters), generate invoice, pay, check status, retry |
| Wallets | 4 | Connect, disconnect, get, balance |
| Stats | 1 | User stats with streaks |
| Notifications | 2 | List (with unread filter), mark as read |
| Docs | 1 | OpenAPI spec |

Full OpenAPI 3.0 spec in [`docs/openapi.yaml`](docs/openapi.yaml).

## Security

- Passwords hashed with bcryptjs (10 salt rounds)
- JWT sessions in httpOnly cookies (7-day expiry) with runtime payload validation
- Route protection via Next.js proxy middleware (dashboard routes require valid JWT)
- NWC wallet URLs encrypted at rest with AES-256-GCM
- Optional TOTP-based 2FA with hashed recovery codes
- Rate limiting on login and register endpoints (IP-based sliding window)
- Account lockout after 10 failed login attempts (30-minute cooldown)
- SQL injection prevention via Drizzle ORM parameterized queries
- All API routes use shared `apiHandler` for consistent error handling

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
