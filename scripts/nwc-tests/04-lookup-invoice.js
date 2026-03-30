/**
 * Test 4: Look up invoice status
 * Verifies: NWC lookupInvoice()
 * Usage: node 04-lookup-invoice.js <payment_hash>
 */
const { NWCClient } = require("@getalby/sdk");
const { NWC_URL } = require("./config");

const PAYMENT_HASH = process.argv[2];

async function main() {
  console.log("=== NWC Test: Lookup Invoice Status ===\n");

  if (!PAYMENT_HASH) {
    console.error("Usage: node 04-lookup-invoice.js <payment_hash>");
    console.error("  Get a payment_hash from test 02 (make invoice).");
    process.exit(1);
  }

  console.log(`  Payment Hash: ${PAYMENT_HASH}`);

  const client = new NWCClient({ nostrWalletConnectUrl: NWC_URL });

  try {
    const lookup = await Promise.race([
      client.lookupInvoice({ payment_hash: PAYMENT_HASH }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout after 10s")), 10000)
      ),
    ]);

    console.log("\nInvoice lookup result:");
    console.log(`  Settled: ${lookup.settled_at ? "YES" : "NO"}`);
    if (lookup.settled_at) {
      const settledDate = new Date(lookup.settled_at * 1000);
      console.log(`  Settled at: ${settledDate.toISOString()}`);
    }
    if (lookup.amount) {
      console.log(`  Amount: ${Math.floor(lookup.amount / 1000)} sats (${lookup.amount} msats)`);
    }
    if (lookup.description) {
      console.log(`  Description: ${lookup.description}`);
    }
    if (lookup.preimage) {
      console.log(`  Preimage: ${lookup.preimage}`);
    }

    console.log("\n✓ Lookup Invoice test PASSED");
  } catch (error) {
    console.error("\n✗ Test FAILED:", error.message);
    if (error.code) console.error("  Error code:", error.code);
  } finally {
    client.close();
  }
}

main();
