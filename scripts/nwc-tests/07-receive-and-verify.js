/**
 * Test 7: Create invoice, wait for external payment, verify via lookup
 * Verifies: makeInvoice() + lookupInvoice() end-to-end receive flow
 *
 * Usage: node 07-receive-and-verify.js [amount_sats]
 *
 * This script creates an invoice, prints it, then polls every 4 seconds
 * to detect when it's been paid. Press Ctrl+C to abort.
 */
const { NWCClient } = require("@getalby/sdk");
const { bech32 } = require("@scure/base");
const { NWC_URL } = require("./config");

const AMOUNT_SATS = parseInt(process.argv[2]) || 5;
const POLL_INTERVAL_MS = 4000;
const MAX_WAIT_MS = 120000; // 2 minutes

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

async function main() {
  console.log("=== NWC Test: Receive & Verify Payment ===\n");
  console.log(`  Amount: ${AMOUNT_SATS} sats`);
  console.log(`  Max wait: ${MAX_WAIT_MS / 1000}s\n`);

  const client = new NWCClient({ nostrWalletConnectUrl: NWC_URL });

  try {
    // Step 1: Check initial balance
    console.log("[Step 1] Checking initial balance...");
    const before = await client.getBalance();
    const beforeSats = Math.floor(before.balance / 1000);
    console.log(`  Balance: ${beforeSats} sats\n`);

    // Step 2: Create invoice
    console.log("[Step 2] Creating invoice...");
    const tx = await Promise.race([
      client.makeInvoice({
        amount: AMOUNT_SATS * 1000,
        description: `BitByBit receive test ${Date.now()}`,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout creating invoice")), 30000)
      ),
    ]);

    const paymentHash = tx.payment_hash || extractPaymentHash(tx.invoice);
    console.log(`  Invoice created!`);
    if (!tx.payment_hash) {
      console.log(`  (payment_hash extracted from BOLT11 — wallet returned empty)`);
    }
    console.log(`  Payment hash: ${paymentHash}\n`);

    console.log("╔══════════════════════════════════════════════╗");
    console.log("║  PAY THIS INVOICE:                          ║");
    console.log("╚══════════════════════════════════════════════╝");
    console.log(tx.invoice);
    console.log("───────────────────────────────────────────────\n");

    if (!paymentHash) {
      console.error("✗ Cannot poll without payment_hash");
      return;
    }

    // Step 3: Poll for payment
    console.log("[Step 3] Polling for payment (every 4s)...");
    const startWait = Date.now();
    let settled = false;

    while (Date.now() - startWait < MAX_WAIT_MS) {
      await sleep(POLL_INTERVAL_MS);
      const elapsed = Math.round((Date.now() - startWait) / 1000);
      process.stdout.write(`  [${elapsed}s] Checking... `);

      try {
        const lookup = await Promise.race([
          client.lookupInvoice({ payment_hash: paymentHash }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 5000)
          ),
        ]);

        if (lookup.settled_at) {
          console.log("PAID!");
          const settledDate = new Date(lookup.settled_at * 1000);
          console.log(`\n  Settled at: ${settledDate.toISOString()}`);
          if (lookup.preimage) {
            console.log(`  Preimage: ${lookup.preimage}`);
          }
          settled = true;
          break;
        } else {
          console.log("not yet");
        }
      } catch (pollErr) {
        console.log(`lookup error: ${pollErr.message}`);
      }
    }

    if (!settled) {
      console.log("\n  ⚠ Timed out waiting for payment (2 minutes)");
      console.log("  Invoice may still be valid — try paying and run test 04 manually:");
      console.log(`  node 04-lookup-invoice.js ${paymentHash}`);
      return;
    }

    // Step 4: Verify balance increased
    console.log("\n[Step 4] Checking final balance...");
    const after = await client.getBalance();
    const afterSats = Math.floor(after.balance / 1000);
    console.log(`  Balance: ${afterSats} sats`);
    console.log(`  Difference: +${afterSats - beforeSats} sats`);

    console.log("\n✓ Receive & Verify test PASSED");
  } catch (error) {
    console.error("\n✗ Test FAILED:", error.message);
    if (error.code) console.error("  Error code:", error.code);
  } finally {
    client.close();
  }
}

main();
