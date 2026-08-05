import "server-only";

import { createHash, createHmac } from "node:crypto";

type BucketConfig = {
  accessKeyId: string;
  bucket: string;
  endpoint: string;
  region: string;
  secretAccessKey: string;
  urlStyle: "path" | "virtual";
};

export class ObjectStorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObjectStorageConfigurationError";
  }
}

function envValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function bucketConfig(): BucketConfig | null {
  const values = {
    accessKeyId: envValue("ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID", "BUCKET_ACCESS_KEY_ID"),
    bucket: envValue("BUCKET", "AWS_S3_BUCKET_NAME", "BUCKET_NAME"),
    endpoint: envValue("ENDPOINT", "AWS_ENDPOINT_URL", "BUCKET_ENDPOINT"),
    region: envValue("REGION", "AWS_DEFAULT_REGION", "BUCKET_REGION") || "auto",
    secretAccessKey: envValue(
      "SECRET_ACCESS_KEY",
      "AWS_SECRET_ACCESS_KEY",
      "BUCKET_SECRET_ACCESS_KEY",
    ),
    urlStyle: envValue("AWS_S3_URL_STYLE") === "path" ? "path" : "virtual",
  } as const;

  const configured = [
    values.accessKeyId,
    values.bucket,
    values.endpoint,
    values.secretAccessKey,
  ].filter(Boolean).length;
  if (!configured) return null;
  if (configured !== 4) {
    throw new ObjectStorageConfigurationError(
      "La configuració del bucket de fitxers és incompleta.",
    );
  }

  return values;
}

function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function objectUrl(config: BucketConfig, key: string) {
  const url = new URL(config.endpoint);
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  if (config.urlStyle === "path") {
    url.pathname = `/${encodeURIComponent(config.bucket)}/${encodedKey}`;
  } else {
    url.hostname = `${config.bucket}.${url.hostname}`;
    url.pathname = `/${encodedKey}`;
  }
  url.search = "";
  return url;
}

function signedHeaders(
  config: BucketConfig,
  method: "DELETE" | "GET" | "PUT",
  url: URL,
  body: Uint8Array,
) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  const canonicalHeaders =
    `host:${url.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const names = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    url.pathname,
    "",
    canonicalHeaders,
    names,
    payloadHash,
  ].join("\n");
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");
  const dateKey = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, config.region);
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  return {
    Authorization:
      `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, ` +
      `SignedHeaders=${names}, Signature=${signature}`,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
}

async function bucketRequest(
  method: "DELETE" | "GET" | "PUT",
  key: string,
  options?: { body?: Uint8Array; contentType?: string },
) {
  const config = bucketConfig();
  if (!config) return null;

  const body = options?.body ?? new Uint8Array();
  const url = objectUrl(config, key);
  const response = await fetch(url, {
    method,
    body: method === "PUT" ? Buffer.from(body) : undefined,
    headers: {
      ...signedHeaders(config, method, url, body),
      ...(options?.contentType ? { "Content-Type": options.contentType } : {}),
    },
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 240);
    throw new Error(
      `El bucket ha rebutjat l'operació (${response.status})${detail ? `: ${detail}` : "."}`,
    );
  }
  return response;
}

export function objectStorageConfigured() {
  return bucketConfig() !== null;
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  const response = await bucketRequest("PUT", key, { body, contentType });
  return response !== null;
}

export async function getObject(key: string) {
  const response = await bucketRequest("GET", key);
  if (!response) return null;
  return new Uint8Array(await response.arrayBuffer());
}

export async function deleteObject(key: string) {
  const response = await bucketRequest("DELETE", key);
  return response !== null;
}
