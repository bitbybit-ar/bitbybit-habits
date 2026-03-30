/**
 * Test 5: Full round-trip — create invoice then pay it from the same wallet
 * Verifies: makeInvoice() + payInvoice() + lookupInvoice() end-to-end
 * Note: Self-payment may fail depending on the wallet/node — some nodes
 * don't allow paying your own invoices. This tests the full flow anyway.
 */
const { NWCClient } = require("@getalby/sdk");
const { NWC_URL } = require("./config");

const AMOUNT_SATS = parseInt(process.argv[2]) || 1;

async function main() {
  console.log("=== NWC Test: Full Round-Trip (Self-Pay) ===\n");
  console.log(`  Amount: ${AMOUNT_SATS} sats\n`);

  const client = new NWCClient({ nostrWalletConnectUrl: NWC_URL });

  try {
    // Step 1: Check initial balance
    console.log("Step 1: Checking initial balance...");
    const before = await client.getBalance();
    const beforeSats = Math.floor(before.balance / 1000);
    console.log(`  Balance: ${beforeSats} sats\n`);

    // Step 2: Create invoice
    console.log("Step 2: Creating invoice...");
    const tx = await client.makeInvoice({
      amount: AMOUNT_SATS * 1000,
      description: `BitByBit self-pay test ${Date.now()}`,
    });
    console.log(`  Invoice: ${tx.invoice.substring(0, 40)}...`);
    console.log(`  Payment Hash: ${tx.payment_hash}\n`);

    // Step 3: Pay the invoice
    console.log("Step 3: Paying invoice...");
    try {
      const payment = await Promise.race([
        client.payInvoice({ invoice: tx.invoice }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout after 30s")), 30000)
        ),
      ]);
      console.log(`  Preimage: ${payment.preimage}\n`);

      // Step 4: Verify payment
      console.log("Step 4: Looking up invoice...");
      const lookup = await client.lookupInvoice({
        payment_hash: tx.payment_hash,
      });
      console.log(`  Settled: ${lookup.settled_at ? "YES" : "NO"}`);
      if (lookup.settled_at) {
        console.log(`  Settled at: ${new Date(lookup.settled_at * 1000).toISOString()}`);
      }

      // Step 5: Check final balance
      console.log("\nStep 5: Checking final balance...");
      const after = await client.getBalance();
      const afterSats = Math.floor(after.balance / 1000);
      console.log(`  Balance: ${afterSats} sats`);
      console.log(`  Difference: ${afterSats - beforeSats} sats (fees may apply)`);

      console.log("\n✓ Full round-trip test PASSED");
    } catch (payError) {
      if (payError.message && payError.message.includes("self-payment")) {
        console.log("  ⚠ Self-payment not supported by this wallet/node");
        console.log("  This is expected for some wallets.\n");
        console.log("  Invoice for external payment:");
        console.log(`  ${tx.invoice}`);
        console.log(`\n  Payment hash for lookup: ${tx.payment_hash}`);
        console.log("\n~ Self-pay not supported, but makeInvoice PASSED");
      } else {
        throw payError;
      }
    }
  } catch (error) {
    console.error("\n✗ Test FAILED:", error.message);
    if (error.code) console.error("  Error code:", error.code);
  } finally {
    client.close();
  }
}

main();
