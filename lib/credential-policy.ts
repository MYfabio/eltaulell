import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_HASH_VERSION = "scrypt-v1";
const PASSWORD_KEY_BYTES = 32;

export function createPasswordHash(
  password: string,
  salt = randomBytes(16).toString("base64url"),
) {
  const digest = scryptSync(password, salt, PASSWORD_KEY_BYTES).toString("base64url");
  return `${PASSWORD_HASH_VERSION}$${salt}$${digest}`;
}

export function passwordMatches(password: string, encodedHash: string) {
  const [version, salt, encodedDigest] = encodedHash.split("$");
  if (version !== PASSWORD_HASH_VERSION || !salt || !encodedDigest) return false;

  try {
    const expected = Buffer.from(encodedDigest, "base64url");
    const supplied = scryptSync(password, salt, expected.length);
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
  } catch {
    return false;
  }
}

