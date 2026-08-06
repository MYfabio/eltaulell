import assert from "node:assert/strict";
import test from "node:test";
import { decryptSecret, encryptSecret } from "../lib/secret-box.ts";

test("connector secrets are encrypted with authenticated AES-GCM", () => {
  const previous = process.env.DATA_ENCRYPTION_KEY;
  process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  try {
    const encrypted = encryptSecret("refresh-token-value");
    assert.notEqual(encrypted, "refresh-token-value");
    assert.equal(decryptSecret(encrypted), "refresh-token-value");
    const parts = encrypted.split(".");
    const tag = Buffer.from(parts[2], "base64url");
    tag[0] ^= 1;
    const tampered = `${parts[0]}.${parts[1]}.${tag.toString("base64url")}.${parts[3]}`;
    assert.throws(() => decryptSecret(tampered));
  } finally {
    if (previous === undefined) delete process.env.DATA_ENCRYPTION_KEY;
    else process.env.DATA_ENCRYPTION_KEY = previous;
  }
});
