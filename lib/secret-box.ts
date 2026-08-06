import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function encryptionKey() {
  const encoded = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (encoded) {
    const key = Buffer.from(encoded, "base64");
    if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY_MUST_BE_32_BYTES");
    return key;
  }
  if (process.env.ELTAULELL_LOCAL_PREVIEW === "1" && process.env.AUTH_SECRET) {
    return createHash("sha256").update(process.env.AUTH_SECRET).digest();
  }
  throw new Error("DATA_ENCRYPTION_KEY_NOT_CONFIGURED");
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptSecret(value: string) {
  const [version, encodedIv, encodedTag, encodedCiphertext] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext) {
    throw new Error("INVALID_ENCRYPTED_SECRET");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function isSecretEncryptionConfigured() {
  return Boolean(
    process.env.DATA_ENCRYPTION_KEY
    || (process.env.ELTAULELL_LOCAL_PREVIEW === "1" && process.env.AUTH_SECRET),
  );
}
