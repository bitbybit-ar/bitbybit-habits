# NWC Integration Tests

Live integration tests for Lightning Network payments via NWC (Nostr Wallet Connect) using `@getalby/sdk`. These run on **mainnet with real sats**.

## Setup

No config files to edit. The script asks for your NWC connection string right in the terminal. The wallet must have sats loaded (minimum 50 sats recommended).

## Running the full suite

```bash
node scripts/nwc-tests/run-all.js
```

The first thing it asks is your NWC string — paste it and press Enter. Same for the individual scripts (`01-get-info.js`, etc.).

### Flags

| Flag | Description |
|------|-------------|
| `--skip-interactive` | Skip Phase 4 (no user prompts, no send/receive tests) |
| `--skip-selfpay` | Skip self-pay round-trip in Phase 3 |
| `--min-balance <N>` | Override minimum balance check (default: 50 sats) |

## Test Phases

The suite runs in 5 ordered phases:

### Phase 1: Connection & Node Info
Verifies the NWC connection works. Calls `getBalance()` and `getInfo()`. If this fails, everything aborts.

### Phase 2: Wallet Funding Check
Ensures the wallet has enough sats to run the remaining tests. If balance is below the minimum, the script stops and prints instructions to fund the wallet.

**LLM note**: If this fails, create a receive invoice with `node 02-make-invoice.js <amount>` and ask the user to pay it, then re-run.

### Phase 3: Automated Payment Tests (no interaction)
- **3a. makeInvoice()** — Creates an invoice, verifies payment_hash extraction from BOLT11 (fallback for Primal bug)
- **3b. Self-pay** — Creates invoice and pays it from the same wallet (may fail on some wallets — that's OK)
- **3c. Encryption** — AES-256-GCM encrypt/decrypt round-trip of NWC URL (requires `ENCRYPTION_KEY` in `.env.local`)

### Phase 4: Interactive Tests (requires user)
- **4a. Receive** — Creates a 5 sat invoice, asks the user to pay it, then verifies settlement via `listTransactions` (since `lookupInvoice` is broken on Primal)
- **4b. Send** — Asks the user for a BOLT11 invoice, pays it with `payInvoice()`, verifies preimage and balance change

**LLM note**: Show the invoice to the user and wait for confirmation. Then ask for their invoice. User can type `skip` to skip the send test.

### Phase 5: Final Balance Check
Reports the final wallet balance after all tests.

## Individual test scripts

| Script | What it tests | Interactive? |
|--------|--------------|--------------|
| `01-get-info.js` | `getBalance()` + `getInfo()` | No |
| `02-make-invoice.js [sats] [desc]` | `makeInvoice()` + BOLT11 hash extraction | No |
| `03-pay-invoice.js <bolt11>` | `payInvoice()` | Yes (needs invoice) |
| `04-lookup-invoice.js <hash>` | `lookupInvoice()` | Yes (needs hash) |
| `05-self-pay.js [sats]` | Full round-trip: make + pay + lookup + balance | No (costs sats) |
| `06-encryption-roundtrip.js` | AES-256-GCM of NWC URL | No |
| `07-receive-and-verify.js [sats]` | Make invoice, poll until paid, verify balance | Yes (someone pays) |

## Known Primal wallet quirks

Discovered during testing — these are worked around in both the test scripts and the app code:

| Issue | Impact | Workaround |
|-------|--------|------------|
| `makeInvoice` returns empty `payment_hash` | Status polling breaks (can't call `lookupInvoice`) | Extract hash from BOLT11 via bech32 decoding (`lib/lightning.ts`) |
| `lookupInvoice` returns `NOT_FOUND` for all invoices | Payment settlement detection fails | Fall back to `listTransactions` and match by `payment_hash` |
| Relay latency 10-30s | Timeouts on default settings | Use 30s timeouts for invoice operations |

## App code fixes applied

These bugs were found by this test suite and fixed in the app:

- **`lib/lightning.ts`** — `extractPaymentHash()` decodes BOLT11 bech32 to get payment hash
- **`app/api/wallets/receive/route.ts`** — Uses hash extraction fallback
- **`app/api/payments/invoice/route.ts`** — Uses hash extraction fallback
- **`app/api/payments/[id]/status/route.ts`** — Falls back to `listTransactions` when `lookupInvoice` returns NOT_FOUND
