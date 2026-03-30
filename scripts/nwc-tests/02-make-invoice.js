/**
 * Test 2: Create a Lightning invoice (receive)
 * Verifies: NWC makeInvoice() + payment_hash extraction fallback
 * Outputs the BOLT11 invoice for manual payment or use in test 03
 *
 * Usage: node 02-make-invoice.js [amount_sats] [description]
 */
const { NWCClient } = require("@getalby/sdk");
const { bech32 } = require("@scure/base");
const { NWC_URL } = require("./config");

const AMOUNT_SATS = parseInt(process.argv[2]) || 10;
const DESCRIPTION = process.argv[3] || "BitByBit NWC test invoice";

/**
 * Extract payment hash from BOLT11 invoice (fallback for wallets that
 * return empty payment_hash, e.g. Primal).
 */
function extractPaymentHash(invoice) {
  try {
    const { words } = bech32.decode(invoice, 2000);
    let pos = 7; // skip timestamp
    while (pos < words.length - 104) { // stop before signature
      const type = words[pos];
      const dataLen = (words[pos + 1] << 5) | words[pos + 2];
      pos += 3;
      if (type === 1 && dataLen === 52) { // 'p' tag = payment hash
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

async function main() {
  console.log("=== NWC Test: Create Invoice (Receive) ===\n");
  console.log(`  Amount: ${AMOUNT_SATS} sats`);
  console.log(`  Description: ${DESCRIPTION}\n`);

  console.log("[LOG] Creating NWCClient...");
  const client = new NWCClient({ nostrWalletConnectUrl: NWC_URL });

  try {
    console.log("[LOG] Calling makeInvoice...");
    const startTime = Date.now();

    const tx = await Promise.race([
      client.makeInvoice({
        amount: AMOUNT_SATS * 1000,
        description: DESCRIPTION,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout after 30s")), 30000)
      ),
    ]);

    const elapsed = Date.now() - startTime;
    console.log(`[LOG] makeInvoice responded in ${elapsed}ms`);

    // Fallback: extract payment_hash from BOLT11 if wallet returns empty
    const nwcHash = tx.payment_hash;
    const extractedHash = extractPaymentHash(tx.invoice);
    const paymentHash = nwcHash || extractedHash || "(none)";

    console.log("\nInvoice created successfully!");
    console.log(`  Payment Request: ${tx.invoice.substring(0, 50)}...`);
    console.log(`  NWC payment_hash: ${nwcHash ? nwcHash : "(empty — wallet bug)"}`);
    if (!nwcHash && extractedHash) {
      console.log(`  Extracted from BOLT11: ${extractedHash}`);
    }
    console.log(`  Final payment_hash: ${paymentHash}`);
    console.log(`  Amount: ${AMOUNT_SATS} sats`);

    console.log("\n--- Copy this invoice to pay it ---");
    console.log(tx.invoice);
    console.log("-----------------------------------");
    console.log(`\n  Payment hash (for lookup): ${paymentHash}`);

    console.log("\n✓ Make Invoice test PASSED");
    if (!nwcHash && extractedHash) {
      console.log("  ✓ BOLT11 fallback extraction PASSED");
    }
  } catch (error) {
    console.error("\n✗ Test FAILED:", error.message);
    if (error.code) console.error("  Error code:", error.code);
  } finally {
    console.log("[LOG] Closing client...");
    client.close();
  }
}

main();
