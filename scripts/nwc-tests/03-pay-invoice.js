/**
 * Test 3: Pay a BOLT11 invoice (send)
 * Verifies: NWC payInvoice()
 * Usage: node 03-pay-invoice.js <bolt11_invoice>
 */
const { NWCClient } = require("@getalby/sdk");
const { NWC_URL } = require("./config");

const INVOICE = process.argv[2];

async function main() {
  console.log("=== NWC Test: Pay Invoice (Send) ===\n");

  if (!INVOICE) {
    console.error("Usage: node 03-pay-invoice.js <bolt11_invoice>");
    console.error("  Get an invoice from test 02 or ask for one externally.");
    process.exit(1);
  }

  // Basic BOLT11 validation
  const bolt11Regex = /^ln(bc|tb|bcrt|tbs)\d*[munp]?1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/i;
  const cleanInvoice = INVOICE.replace(/^lightning:/i, "").trim();

  if (!bolt11Regex.test(cleanInvoice)) {
    console.error("✗ Invalid BOLT11 invoice format");
    process.exit(1);
  }

  console.log(`  Invoice: ${cleanInvoice.substring(0, 40)}...${cleanInvoice.substring(cleanInvoice.length - 10)}`);

  const client = new NWCClient({ nostrWalletConnectUrl: NWC_URL });

  try {
    console.log("\nSending payment...");
    const result = await Promise.race([
      client.payInvoice({ invoice: cleanInvoice }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout after 30s")), 30000)
      ),
    ]);

    console.log("\nPayment successful!");
    console.log(`  Preimage: ${result.preimage}`);
    if (result.payment_hash) {
      console.log(`  Payment Hash: ${result.payment_hash}`);
    }

    console.log("\n✓ Pay Invoice test PASSED");
  } catch (error) {
    console.error("\n✗ Test FAILED:", error.message);
    if (error.code) console.error("  Error code:", error.code);
    if (error.code === "INSUFFICIENT_BALANCE") {
      console.error("  → Wallet doesn't have enough sats");
    } else if (error.code === "RATE_LIMITED") {
      console.error("  → Wallet is rate limited, try again later");
    }
  } finally {
    client.close();
  }
}

main();
