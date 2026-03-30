/**
 * NWC config for individual test scripts (01-07).
 *
 * When run via run-all.js, the NWC_URL is passed as an env var
 * (set automatically — the user already pasted it in Phase 0).
 *
 * When run standalone, prompts in the terminal.
 */

let NWC_URL = process.env.NWC_URL || "";

if (!NWC_URL) {
  const readline = require("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // Synchronous prompt via spawnSync so require() callers get the value immediately
  const { execSync } = require("child_process");
  try {
    NWC_URL = execSync(
      'read -p "Paste your NWC connection string: " nwc && echo "$nwc"',
      { stdio: ["inherit", "pipe", "inherit"], encoding: "utf8" }
    ).trim();
  } catch {
    console.error("ERROR: NWC connection string is required.");
    process.exit(1);
  }

  if (!NWC_URL.startsWith("nostr+walletconnect://")) {
    console.error("ERROR: Invalid NWC string. Must start with nostr+walletconnect://");
    process.exit(1);
  }
}

module.exports = { NWC_URL };
