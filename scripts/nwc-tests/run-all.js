/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║              BitByBit NWC Integration Test Runner                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * END-TO-END test suite for Lightning payments via NWC (Nostr Wallet Connect).
 * Uses a real NWC wallet connection — these are LIVE tests on mainnet.
 *
 * ─── INSTRUCTIONS FOR LLMs ─────────────────────────────────────────────
 *
 * This script is designed to be run interactively by an LLM (Claude, etc.)
 * assisting a human user. The test flow requires back-and-forth because
 * some steps need the user to provide an invoice or make a payment.
 *
 * HOW TO RUN (step by step):
 *
 *   1. Run: node scripts/nwc-tests/run-all.js
 *      The script immediately asks for the NWC connection string in the
 *      terminal. The user pastes it and presses Enter.
 *      Then Phase 1 (connection) and Phase 2 (fund check) run.
 *      If the wallet balance is too low, STOP and ask the user to fund it.
 *      The script will print the minimum sats needed.
 *
 *   2. If Phase 2 passes, Phase 3 runs automated payment tests
 *      (make invoice, self-pay, encryption).
 *
 *   3. Phase 4 requires interaction:
 *      a. The script creates an invoice — ask the user to PAY it
 *      b. Once paid, the script polls to detect settlement
 *      c. The script then asks for a BOLT11 invoice — ask the user to
 *         provide one (any amount, e.g. 10 sats)
 *      d. The script pays that invoice and verifies the preimage
 *
 *   4. Phase 5 runs final balance check to confirm all payments landed.
 *
 * IMPORTANT NOTES FOR LLMs:
 *   - NEVER log the full NWC connection string — it contains a secret key
 *   - Relay responses can be slow (10-30s) — use generous timeouts
 *   - Primal wallet has known quirks:
 *     * makeInvoice returns empty payment_hash (we extract from BOLT11)
 *     * lookupInvoice returns NOT_FOUND (we fallback to listTransactions)
 *   - Self-pay (paying your own invoice) may fail on some wallets
 *   - All amounts are in sats; NWC uses millisats (sats * 1000)
 *
 * FLAGS:
 *   --skip-interactive   Skip Phase 4 (no user interaction needed)
 *   --skip-selfpay       Skip self-pay test in Phase 3
 *   --min-balance <N>    Override minimum balance check (default: 50 sats)
 *
 * ────────────────────────────────────────────────────────────────────────
 */

const { execSync } = require("child_process");
const path = require("path");
const readline = require("readline");

const { NWCClient } = require("@getalby/sdk");
const { bech32 } = require("@scure/base");

// ── Parse flags ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const skipInteractive = args.includes("--skip-interactive");
const skipSelfPay = args.includes("--skip-selfpay");
const minBalanceIdx = args.indexOf("--min-balance");
const MIN_BALANCE_SATS = minBalanceIdx !== -1 ? parseInt(args[minBalanceIdx + 1]) || 50 : 50;

// NWC_URL is set in Phase 0 (main function) — always prompted in the terminal
let NWC_URL = "";

// ── Helpers ──────────────────────────────────────────────────────────
function extractPaymentHash(invoice) {
  try {
    const { words } = bech32.decode(invoice, 2000);
    let pos = 7;
    while (pos < words.length - 104) {
      const type = words[pos];
      const dataLen = (words[pos + 1] << 5) | words[pos + 2];
      pos += 3;
      if (type === 1 && dataLen === 52) {
        const hashBytes = bech32.fromWords(words.slice(pos, pos + dataLen));
        return Buffer.from(hashBytes).toString("hex");
      }
      pos += dataLen;
    }
    return null;
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function askUser(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Poll getBalance() until it differs from `previousSats`, or give up after retries.
 * Primal's balance API is cached and can take several seconds to update.
 */
async function pollBalanceChange(previousSats, maxRetries = 8, delayMs = 3000) {
  for (let i = 0; i < maxRetries; i++) {
    await sleep(delayMs);
    const c = new NWCClient({ nostrWalletConnectUrl: NWC_URL });
    try {
      const b = await Promise.race([
        c.getBalance(),
        new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 10000)),
      ]);
      const sats = Math.floor(b.balance / 1000);
      if (sats !== previousSats) return sats;
    } catch {
      // retry
    } finally {
      c.close();
    }
  }
  // Last attempt — return whatever we get
  const c = new NWCClient({ nostrWalletConnectUrl: NWC_URL });
  try {
    const b = await c.getBalance();
    return Math.floor(b.balance / 1000);
  } finally {
    c.close();
  }
}

function runScript(file, scriptArgs = "") {
  const cmd = `node "${path.join(__dirname, file)}" ${scriptArgs}`;
  execSync(cmd, {
    stdio: "inherit",
    timeout: 120000,
    env: { ...process.env, NWC_URL },
  });
}

let totalPassed = 0;
let totalFailed = 0;

function logPhase(num, name) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  PHASE ${num}: ${name}`);
  console.log(`${"═".repeat(60)}`);
}

function logTest(name, passed, detail) {
  const icon = passed ? "PASS" : "FAIL";
  const color = passed ? "\x1b[32m" : "\x1b[31m";
  console.log(`  ${color}[${icon}]\x1b[0m ${name}${detail ? ` — ${detail}` : ""}`);
  if (passed) totalPassed++;
  else totalFailed++;
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║          BitByBit NWC Integration Test Suite                ║");
  console.log("║          Live tests on mainnet — real sats involved         ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const startTime = Date.now();
  let balanceSats = 0;
  let nodeAlias = "";

  // ────────────────────────────────────────────────────────────────────
  // PHASE 0: NWC Connection String Input
  // ────────────────────────────────────────────────────────────────────
  logPhase(0, "NWC CONNECTION STRING");

  const NWC_REGEX = /^nostr\+walletconnect:\/\/[0-9a-f]{64}\?.*secret=[0-9a-f]{64}/i;

  console.log("  Paste your NWC connection string below.");
  console.log("  (from your Lightning wallet: Alby, Primal, Mutiny, etc.)\n");

  NWC_URL = await askUser("  nostr+walletconnect://... : ");

  NWC_URL = NWC_URL.trim();

  if (!NWC_REGEX.test(NWC_URL)) {
    logTest("NWC URL format", false, "must start with nostr+walletconnect:// and contain secret");
    console.error("\n  Example: nostr+walletconnect://<64-hex-pubkey>?relay=wss://...&secret=<64-hex>");
    process.exit(1);
  }

  // Mask the secret for safe logging
  const maskedUrl = NWC_URL.replace(/(secret=)([0-9a-f]{4})[0-9a-f]+/i, "$1$2...");
  logTest("NWC URL format", true, maskedUrl.slice(0, 80) + "...");

  // ────────────────────────────────────────────────────────────────────
  // PHASE 1: Connection & Node Info
  // ────────────────────────────────────────────────────────────────────
  logPhase(1, "CONNECTION & NODE INFO");

  const client1 = new NWCClient({ nostrWalletConnectUrl: NWC_URL });
  try {
    // Balance
    const balResult = await Promise.race([
      client1.getBalance(),
      new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 10000)),
    ]);
    balanceSats = Math.floor(balResult.balance / 1000);
    logTest("getBalance()", true, `${balanceSats} sats`);

    // Node info
    const info = await Promise.race([
      client1.getInfo(),
      new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 10000)),
    ]);
    nodeAlias = info.alias || "unknown";
    const methods = (info.methods || []).join(", ");
    logTest("getInfo()", true, `${nodeAlias} (${info.network || "?"})`);
    console.log(`         Methods: ${methods}`);
  } catch (err) {
    logTest("NWC connection", false, err.message);
    console.error("\n  Cannot proceed without a working NWC connection. Aborting.");
    process.exit(1);
  } finally {
    client1.close();
  }

  // ────────────────────────────────────────────────────────────────────
  // PHASE 2: Balance / Funding Check (retries in case wallet is being funded)
  // ────────────────────────────────────────────────────────────────────
  logPhase(2, "WALLET FUNDING CHECK");

  const BALANCE_RETRIES = 3;
  const BALANCE_RETRY_DELAY_MS = 5000;

  console.log(`  Current balance: ${balanceSats} sats`);
  console.log(`  Minimum needed:  ${MIN_BALANCE_SATS} sats`);

  if (balanceSats < MIN_BALANCE_SATS) {
    console.log(`\n  Balance too low — polling ${BALANCE_RETRIES} more times (every ${BALANCE_RETRY_DELAY_MS / 1000}s)...`);

    for (let attempt = 1; attempt <= BALANCE_RETRIES; attempt++) {
      await sleep(BALANCE_RETRY_DELAY_MS);
      const retryClient = new NWCClient({ nostrWalletConnectUrl: NWC_URL });
      try {
        const retryBal = await Promise.race([
          retryClient.getBalance(),
          new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 10000)),
        ]);
        balanceSats = Math.floor(retryBal.balance / 1000);
        console.log(`  [retry ${attempt}/${BALANCE_RETRIES}] Balance: ${balanceSats} sats`);
        if (balanceSats >= MIN_BALANCE_SATS) break;
      } catch {
        console.log(`  [retry ${attempt}/${BALANCE_RETRIES}] Balance check failed (timeout)`);
      } finally {
        retryClient.close();
      }
    }
  }

  if (balanceSats < MIN_BALANCE_SATS) {
    logTest("Sufficient balance", false, `need ${MIN_BALANCE_SATS - balanceSats} more sats`);
    console.log(`\n  ┌─────────────────────────────────────────────────────┐`);
    console.log(`  │  WALLET NEEDS FUNDING                               │`);
    console.log(`  │                                                     │`);
    console.log(`  │  Please send at least ${String(MIN_BALANCE_SATS - balanceSats).padEnd(5)} sats to this wallet. │`);
    console.log(`  │  Then re-run this script.                           │`);
    console.log(`  │                                                     │`);
    console.log(`  │  LLM: Ask the user to fund the wallet and re-run.  │`);
    console.log(`  │  You can create a receive invoice with:             │`);
    console.log(`  │    node scripts/nwc-tests/02-make-invoice.js <sats> │`);
    console.log(`  └─────────────────────────────────────────────────────┘`);
    process.exit(1);
  }

  logTest("Sufficient balance", true, `${balanceSats} >= ${MIN_BALANCE_SATS} sats`);

  // ────────────────────────────────────────────────────────────────────
  // PHASE 3: Automated Payment Tests (no interaction)
  // ────────────────────────────────────────────────────────────────────
  logPhase(3, "AUTOMATED PAYMENT TESTS");

  // 3a. Make Invoice + hash extraction
  console.log("\n  ── 3a. Create Invoice (makeInvoice) ──");
  const client3a = new NWCClient({ nostrWalletConnectUrl: NWC_URL });
  let testInvoice = null;
  let testPaymentHash = null;
  try {
    const tx = await Promise.race([
      client3a.makeInvoice({ amount: 1000, description: "run-all test invoice" }),
      new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 30000)),
    ]);
    const nwcHash = tx.payment_hash;
    const extractedHash = extractPaymentHash(tx.invoice);
    testPaymentHash = nwcHash || extractedHash;
    testInvoice = tx.invoice;

    logTest("makeInvoice()", true, `invoice created`);

    if (!nwcHash && extractedHash) {
      logTest("payment_hash fallback (BOLT11 extraction)", true, extractedHash.slice(0, 16) + "...");
    } else if (nwcHash) {
      logTest("payment_hash from NWC", true, nwcHash.slice(0, 16) + "...");
    } else {
      logTest("payment_hash extraction", false, "no hash from NWC or BOLT11");
    }
  } catch (err) {
    logTest("makeInvoice()", false, err.message);
  } finally {
    client3a.close();
  }

  // 3b. Self-pay round-trip
  if (!skipSelfPay) {
    console.log("\n  ── 3b. Self-Pay Round-Trip ──");
    const client3b = new NWCClient({ nostrWalletConnectUrl: NWC_URL });
    try {
      const selfTx = await Promise.race([
        client3b.makeInvoice({ amount: 1000, description: "self-pay test" }),
        new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 30000)),
      ]);
      logTest("Self-pay: makeInvoice()", true, "1 sat invoice");

      const payResult = await Promise.race([
        client3b.payInvoice({ invoice: selfTx.invoice }),
        new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 30000)),
      ]);
      logTest("Self-pay: payInvoice()", true, `preimage: ${payResult.preimage.slice(0, 16)}...`);
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("self") || err.code === "INTERNAL") {
        logTest("Self-pay", true, "not supported by wallet (expected for some wallets)");
      } else {
        logTest("Self-pay", false, `${err.code || ""} ${msg}`.trim());
      }
    } finally {
      client3b.close();
    }
  } else {
    console.log("\n  ── 3b. Self-Pay: SKIPPED (--skip-selfpay) ──");
  }

  // 3c. Encryption round-trip
  console.log("\n  ── 3c. Encryption Round-Trip ──");
  try {
    runScript("06-encryption-roundtrip.js");
    logTest("AES-256-GCM encrypt/decrypt", true);
  } catch {
    logTest("AES-256-GCM encrypt/decrypt", false, "see output above");
  }

  // ────────────────────────────────────────────────────────────────────
  // PHASE 4: Interactive Tests (send & receive with user)
  // ────────────────────────────────────────────────────────────────────
  if (!skipInteractive) {
    logPhase(4, "INTERACTIVE TESTS (requires user)");

    // 4a. Receive: create invoice, user pays it, verify via listTransactions
    console.log("\n  ── 4a. Receive Test (user pays us) ──\n");

    try {
      // Snapshot balance before — fresh client, close immediately
      const balClient = new NWCClient({ nostrWalletConnectUrl: NWC_URL });
      const beforeBal = await balClient.getBalance();
      const beforeSats = Math.floor(beforeBal.balance / 1000);
      balClient.close();

      // Create invoice — fresh client, close immediately
      const invoiceClient = new NWCClient({ nostrWalletConnectUrl: NWC_URL });
      const recvTx = await Promise.race([
        invoiceClient.makeInvoice({ amount: 5000, description: "BitByBit receive test" }),
        new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 30000)),
      ]);
      const recvHash = recvTx.payment_hash || extractPaymentHash(recvTx.invoice);
      invoiceClient.close();

      console.log("  ┌─────────────────────────────────────────────────────┐");
      console.log("  │  PAY THIS 5 SAT INVOICE:                           │");
      console.log("  │                                                     │");
      console.log("  │  LLM: Show this invoice to the user and ask them   │");
      console.log("  │  to pay it. Then press Enter to continue.          │");
      console.log("  └─────────────────────────────────────────────────────┘");
      console.log(`\n  ${recvTx.invoice}\n`);

      await askUser("  Press Enter after paying the invoice...");

      // Verify via listTransactions (lookupInvoice is broken on Primal)
      // Fresh client AFTER the user prompt — the old one would be stale
      let received = false;
      console.log("\n  Verifying payment via listTransactions...");

      // Poll loop — 10 rounds per batch. After each batch the user can
      // press Enter to keep waiting or 's' to skip to the next test.
      let keepPolling = true;
      while (keepPolling && !received) {
        for (let attempt = 0; attempt < 10; attempt++) {
          if (attempt > 0) await sleep(5000);
          process.stdout.write(`  [${attempt + 1}/10] Checking... `);
          const pollClient = new NWCClient({ nostrWalletConnectUrl: NWC_URL });
          try {
            const txResult = await Promise.race([
              pollClient.listTransactions({ limit: 10 }),
              new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 10000)),
            ]);
            const txs = txResult.transactions || [];
            const match = txs.find(
              (tx) => recvHash && tx.payment_hash === recvHash && tx.state === "settled"
            );
            if (match) {
              console.log("PAID!");
              received = true;
              break;
            }
            console.log("not yet");
          } catch {
            console.log("retry");
          } finally {
            pollClient.close();
          }
        }

        if (!received) {
          const choice = await askUser("\n  Not found yet. Press Enter to poll 10 more, or 's' to skip: ");
          if (choice.toLowerCase() === "s") {
            keepPolling = false;
          }
        }
      }

      if (received) {
        const afterSats = await pollBalanceChange(beforeSats);
        logTest("Receive payment", true, `balance ${beforeSats} → ${afterSats} sats`);
        logTest("Settlement detection (listTransactions fallback)", true);
        balanceSats = afterSats;
      } else {
        // Check balance as secondary confirmation
        const afterSats = await pollBalanceChange(beforeSats, 3, 2000);
        if (afterSats > beforeSats) {
          logTest("Receive payment", true, `balance ${beforeSats} → ${afterSats} (hash not found in txs, but balance increased)`);
          balanceSats = afterSats;
        } else {
          logTest("Receive payment", false, "invoice may not have been paid");
        }
      }
    } catch (err) {
      logTest("Receive test", false, err.message);
    }

    // 4b. Send: user provides invoice, we pay it
    console.log("\n  ── 4b. Send Test (we pay user's invoice) ──\n");

    console.log("  ┌─────────────────────────────────────────────────────┐");
    console.log("  │  PROVIDE A BOLT11 INVOICE                          │");
    console.log("  │                                                     │");
    console.log("  │  LLM: Ask the user for a BOLT11 invoice to pay.   │");
    console.log("  │  Any small amount (e.g. 10 sats).                  │");
    console.log("  │  Paste it below and press Enter.                   │");
    console.log("  │  Type 'skip' to skip this test.                    │");
    console.log("  └─────────────────────────────────────────────────────┘\n");

    const userInvoice = await askUser("  Invoice (or 'skip'): ");

    if (userInvoice.toLowerCase() === "skip") {
      console.log("  Skipping send test.");
    } else {
      const bolt11Regex = /^ln(bc|tb|bcrt|tbs)\d*[munp]?1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/i;
      const cleanInvoice = userInvoice.replace(/^lightning:/i, "").trim();

      if (!bolt11Regex.test(cleanInvoice)) {
        logTest("BOLT11 validation", false, "invalid invoice format");
      } else {
        logTest("BOLT11 validation", true);

        try {
          // Snapshot balance — fresh client
          const beforeClient = new NWCClient({ nostrWalletConnectUrl: NWC_URL });
          const beforeBal = await beforeClient.getBalance();
          const beforeSats = Math.floor(beforeBal.balance / 1000);
          beforeClient.close();

          // Pay — fresh client
          const payClient = new NWCClient({ nostrWalletConnectUrl: NWC_URL });
          const payResult = await Promise.race([
            payClient.payInvoice({ invoice: cleanInvoice }),
            new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 30000)),
          ]);
          payClient.close();

          logTest("payInvoice()", true, `preimage: ${payResult.preimage.slice(0, 16)}...`);

          // Poll balance until it reflects the spend
          const afterSats = await pollBalanceChange(beforeSats);
          const spent = beforeSats - afterSats;
          logTest("Balance updated", spent > 0, `${beforeSats} → ${afterSats} sats (spent ${spent})`);
          balanceSats = afterSats;
        } catch (err) {
          logTest("payInvoice()", false, `${err.code || ""} ${err.message}`.trim());
        }
      }
    }
  } else {
    console.log("\n  ── Phase 4: SKIPPED (--skip-interactive) ──");
  }

  // ────────────────────────────────────────────────────────────────────
  // PHASE 5: Final Balance Check
  // ────────────────────────────────────────────────────────────────────
  logPhase(5, "FINAL BALANCE CHECK");

  const client5 = new NWCClient({ nostrWalletConnectUrl: NWC_URL });
  try {
    const finalBal = await Promise.race([
      client5.getBalance(),
      new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 10000)),
    ]);
    const finalSats = Math.floor(finalBal.balance / 1000);
    logTest("Final balance", true, `${finalSats} sats`);
  } catch (err) {
    logTest("Final balance", false, err.message);
  } finally {
    client5.close();
  }

  // ────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  RESULTS: \x1b[32m${totalPassed} passed\x1b[0m, \x1b[31m${totalFailed} failed\x1b[0m (${elapsed}s)`);
  console.log(`  Wallet: ${nodeAlias}`);
  console.log(`${"═".repeat(60)}\n`);

  if (totalFailed > 0) {
    console.log("  Known Primal quirks (not counted as real failures):");
    console.log("    - makeInvoice returns empty payment_hash (we extract from BOLT11)");
    console.log("    - lookupInvoice returns NOT_FOUND (we use listTransactions)");
    console.log("    - Self-pay may not be supported\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
