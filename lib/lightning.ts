/**
 * Lightning/BOLT11 utilities.
 *
 * Extracts payment_hash from a BOLT11 invoice using bech32 decoding.
 * Some NWC wallets (e.g. Primal) return an empty payment_hash from
 * makeInvoice — this lets us recover it from the invoice itself.
 */
import { bech32 } from "@scure/base";

/**
 * Extract the payment hash (hex) from a BOLT11 invoice string.
 * Returns `null` if the invoice cannot be decoded or has no payment hash tag.
 */
export function extractPaymentHash(invoice: string): string | null {
  try {
    const { words } = bech32.decode(invoice as `${string}1${string}`, 2000);

    // Skip timestamp (first 7 five-bit words = 35 bits)
    // Parse tagged fields until we hit the signature (last 104 words)
    let pos = 7;
    while (pos < words.length - 104) {
      const type = words[pos];
      const dataLen = (words[pos + 1] << 5) | words[pos + 2];
      pos += 3;

      // Tag type 1 = 'p' = payment hash (32 bytes / 256 bits)
      if (type === 1 && dataLen === 52) {
        const hashWords = words.slice(pos, pos + dataLen);
        const hashBytes = bech32.fromWords(hashWords);
        return Buffer.from(hashBytes).toString("hex");
      }

      pos += dataLen;
    }

    return null;
  } catch {
    return null;
  }
}
