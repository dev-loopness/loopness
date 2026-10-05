// Where uploaded videos live.
// Live: Cloudflare R2 (S3-compatible object storage), so storage never runs out on the host's disk.
// Demo mode: the local data/uploads folder, so the app runs with no accounts at all.

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config, isDemoMode } from "./config";
import { UPLOAD_DIR } from "./store";

export type StorageKind = "r2" | "local";

const r2Ready = () => Boolean(config.r2.accountId && config.r2.accessKeyId && config.r2.secretAccessKey && config.r2.bucket);

/** Where new uploads go, or null when the live app has no video storage set up yet. */
export function uploadTarget(): StorageKind | null {
  if (r2Ready()) return "r2";
  return isDemoMode ? "local" : null;
}

let client: S3Client | null = null;
function r2(): S3Client {
  client ??= new S3Client({
    region: "auto",
    forcePathStyle: true,
    endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey },
  });
  return client;
}

const key = (file: string) => `videos/${file}`;

export async function saveVideo(target: StorageKind, file: string, body: Buffer, contentType: string) {
  if (target === "r2") {
    await r2().send(new PutObjectCommand({ Bucket: config.r2.bucket, Key: key(file), Body: body, ContentType: contentType }));
    return;
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, file), body);
}

/** A short-lived link the browser can stream (and seek) directly from R2. */
export async function signedVideoUrl(file: string): Promise<string> {
  return getSignedUrl(r2(), new GetObjectCommand({ Bucket: config.r2.bucket, Key: key(file) }), { expiresIn: 60 * 60 });
}
