import assert from "node:assert/strict";
import test from "node:test";
import { totpAt, verifyTotp } from "../lib/totp.ts";

const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

test("TOTP uses the RFC 6238 time counter", () => {
  assert.equal(totpAt(RFC_SECRET, 1), "287082");
  assert.equal(verifyTotp(RFC_SECRET, "287082", 59_000), true);
});

test("TOTP accepts only the adjacent time window", () => {
  const now = 1_700_000_000_000;
  const currentCounter = Math.floor(now / 30_000);
  assert.equal(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, currentCounter - 1), now), true);
  assert.equal(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, currentCounter + 2), now), false);
  assert.equal(verifyTotp(RFC_SECRET, "12345", now), false);
});
