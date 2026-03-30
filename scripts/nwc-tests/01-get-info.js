/**
 * Test 1: Get wallet balance and node info
 * Verifies: NWC connection, getBalance(), getInfo()
 */
const { NWCClient } = require("@getalby/sdk");
const { NWC_URL } = require("./config");

async function main() {
  console.log("=== NWC Test: Get Balance & Node Info ===\n");

  const client = new NWCClient({ nostrWalletConnectUrl: NWC_URL });

  try {
    // Get balance
    console.log("Fetching balance...");
    const balanceResult = await Promise.race([
      client.getBalance(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout after 10s")), 10000)
      ),
    ]);
    const balanceSats = Math.floor(balanceResult.balance / 1000);
    console.log(`  Balance: ${balanceSats} sats (${balanceResult.balance} msats)`);

    // Get node info
    console.log("\nFetching node info...");
    const info = await Promise.race([
      client.getInfo(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout after 10s")), 10000)
      ),
    ]);
    console.log("  Node Info:");
    console.log(`    Alias: ${info.alias || "N/A"}`);
    console.log(`    Pubkey: ${info.pubkey || "N/A"}`);
    console.log(`    Network: ${info.network || "N/A"}`);
    console.log(`    Color: ${info.color || "N/A"}`);
    console.log(`    Block Height: ${info.block_height || "N/A"}`);
    console.log(`    Methods: ${(info.methods || []).join(", ") || "N/A"}`);

    console.log("\n✓ Balance & Info test PASSED");
  } catch (error) {
    console.error("\n✗ Test FAILED:", error.message);
    if (error.code) console.error("  Error code:", error.code);
  } finally {
    client.close();
  }
}

main();
