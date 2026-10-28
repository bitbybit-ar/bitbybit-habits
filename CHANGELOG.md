# Changelog

## [1.1.0](https://github.com/bitbybit-ar/bitbybit-habits/compare/v1.0.0...v1.1.0) (2026-10-28)


### Features

* centralize session state with SessionProvider ([dfabd1f](https://github.com/bitbybit-ar/bitbybit-habits/commit/dfabd1f2848f7d12ab2bd4f097a97d2e1d16f4be))
* centralize session with SessionProvider ([3014a31](https://github.com/bitbybit-ar/bitbybit-habits/commit/3014a316f811b4c9e487004857ec1c0c2b76367d))
* credit BitByBit in the footer and use the studio favicon ([47a3cd7](https://github.com/bitbybit-ar/bitbybit-habits/commit/47a3cd7c482e964315d2a2b8476e1e199b9f3851))


### Bug Fixes

* **deps:** upgrade next to 16.4.2, react to 19.3.1 and drizzle-orm to 0.45.4 ([24f44dd](https://github.com/bitbybit-ar/bitbybit-habits/commit/24f44ddeca4bddbc6a896dc48303c65921be76c4))
* **deps:** upgrade Next.js to 16.4.2 and patch production advisories ([aa17396](https://github.com/bitbybit-ar/bitbybit-habits/commit/aa1739695d0f48f9dc9bd78a3f9519656d9598fc))
* **seo:** canonicalize habits pages to habits.bitbybit.com.ar ([d721cde](https://github.com/bitbybit-ar/bitbybit-habits/commit/d721cdee6679b9b38bc42c739453ec38feb81e10))
* **seo:** canonicalize habits pages to habits.bitbybit.com.ar ([6ee9764](https://github.com/bitbybit-ar/bitbybit-habits/commit/6ee97646d4995de01e2554879fc51a05b2eeee12))

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
