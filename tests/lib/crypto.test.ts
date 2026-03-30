// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomBytes } from "crypto";

// Generate a valid 32-byte key for testing
const TEST_KEY = randomBytes(32).toString("base64");

describe("lib/crypto", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", TEST_KEY);
  });

  it("encrypts and decrypts a string round-trip", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const plaintext = "nostr+walletconnect://relay.example.com?secret=abc123";

    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(typeof encrypted).toBe("string");

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for the same input (random IV)", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const plaintext = "same-input-different-output";

    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);
    expect(enc1).not.toBe(enc2);
  });

  it("throws when ENCRYPTION_KEY is missing", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "");
    const { encrypt } = await import("@/lib/crypto");
    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY");
  });

  it("throws when ENCRYPTION_KEY is wrong length", async () => {
    vi.stubEnv("ENCRYPTION_KEY", randomBytes(16).toString("base64"));
    const { encrypt } = await import("@/lib/crypto");
    expect(() => encrypt("test")).toThrow("32 bytes");
  });

  it("fails to decrypt with tampered data", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const encrypted = encrypt("secret data");

    // Tamper with the encrypted data
    const buf = Buffer.from(encrypted, "base64");
    buf[20] ^= 0xff; // flip a byte in the ciphertext
    const tampered = buf.toString("base64");

    expect(() => decrypt(tampered)).toThrow();
  });
});
