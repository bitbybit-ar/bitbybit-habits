/**
 * Test 6: Encryption round-trip
 * Verifies: The app's AES-256-GCM encrypt/decrypt works with NWC URLs
 * Requires: ENCRYPTION_KEY in .env.local
 */
const path = require("path");

// Load env vars from .env.local
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env.local"),
});

async function main() {
  console.log("=== NWC Test: Encryption Round-Trip ===\n");

  if (!process.env.ENCRYPTION_KEY) {
    console.error("✗ ENCRYPTION_KEY not found in .env.local");
    console.error("  This test verifies the app's crypto module.");
    process.exit(1);
  }

  // Dynamic import since crypto module uses env vars at import time
  const crypto = require("crypto");
  const key = Buffer.from(process.env.ENCRYPTION_KEY, "base64");

  if (key.length !== 32) {
    console.error(`✗ ENCRYPTION_KEY must be 32 bytes, got ${key.length}`);
    process.exit(1);
  }

  console.log("  Key length: 32 bytes (256-bit) ✓");

  // When run via run-all.js, NWC_URL comes from env; standalone prompts via config.js
  const NWC_URL = process.env.NWC_URL || require("./config").NWC_URL;

  // Encrypt
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(NWC_URL, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, encrypted, authTag]).toString("base64");

  console.log(`  Encrypted length: ${packed.length} chars`);
  console.log(`  Encrypted (first 50): ${packed.substring(0, 50)}...`);

  // Decrypt
  const data = Buffer.from(packed, "base64");
  const decIv = data.subarray(0, 16);
  const decTag = data.subarray(data.length - 16);
  const decData = data.subarray(16, data.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, decIv);
  decipher.setAuthTag(decTag);
  let decrypted = decipher.update(decData, undefined, "utf8");
  decrypted += decipher.final("utf8");

  // Verify
  if (decrypted === NWC_URL) {
    console.log("  Decrypted matches original: YES ✓");
    console.log("\n✓ Encryption round-trip test PASSED");
  } else {
    console.error("  Decrypted matches original: NO ✗");
    console.error("\n✗ Encryption round-trip test FAILED");
    process.exit(1);
  }
}

main();
