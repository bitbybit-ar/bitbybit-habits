# Changelog

## [1.1.0](https://github.com/bitbybit-ar/bitbybit-habits/compare/v1.0.0...v1.1.0) (2026-04-10)


### Features

* centralize session state with SessionProvider ([dfabd1f](https://github.com/bitbybit-ar/bitbybit-habits/commit/dfabd1f2848f7d12ab2bd4f097a97d2e1d16f4be))
* centralize session with SessionProvider ([3014a31](https://github.com/bitbybit-ar/bitbybit-habits/commit/3014a316f811b4c9e487004857ec1c0c2b76367d))

## [Unreleased]

### Features — Lightning Payments (FOUNDATIONS hackathon)

* Lightning invoice generation via kid's NWC wallet (`POST /api/payments/invoice`)
* Payment status polling via NWC `lookupInvoice` with 5s timeout (`GET /api/payments/{id}/status`)
* Sponsor auto-pay via NWC wallet (`POST /api/payments/{id}/pay`)
* Wallet balance fetching via NWC `getBalance` (`GET /api/wallets/balance`)
* Invoice modal component with QR code, copy-to-clipboard, and auto-polling (every 4s)
* Multi-strategy payment cascade: WebLN extension → NWC auto-pay → QR invoice modal → graceful fallback
* WebLN browser extension detection hook (`useWebLN`)
* Wallet connect component with NWC badge, balance display, and extension connect button
* Both sponsors AND kids can connect Lightning wallets
* 22 new tests for payment endpoints (invoice, status, pay)
* OpenAPI documentation for all new endpoints
* i18n translations (ES/EN) for all new UI text

## [0.1.0](https://github.com/bitbybit-ar/bitbybit-habits/releases/tag/v0.1.0) (2026-03-23)

### Features

* Full app structure with kid/sponsor dashboards, auth, API, i18n, and Swagger docs
* Landing page with hero, features, team section, and i18n (ES/EN)
* Family system with roles (sponsor/kid), join codes, and member management
* Habit tracking with daily/weekly completions and approval workflows
* Lightning wallet connection via Alby SDK (NWC)
* Sat rewards system for completed habits
* Stats and streaks tracking
* Push notification support
* Dark/light theme with system preference detection
* Demo mode for trying the app without signup
* Responsive mobile-first design with bottom navigation
* Cookie consent with locale support
