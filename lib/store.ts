// Simple file-based storage so the app runs with no database account.
// Everything lives in data/db.json; uploaded videos live in data/uploads/.
// Before real launch, swap this file for a hosted database (see README "Going live").

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { PlanName } from "./config";

export const DATA_DIR = process.env.DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");

export type SubmissionStatus = "queued" | "reviewed" | "needs_revision";
export type SubmissionKind = "upload" | "youtube" | "tiktok" | "link";

export interface BusinessSettings {
  rubric: string[];
  snippets: string[];
  promiseHours: number;
  /** Max open (unreviewed) submissions per member. 0 = no cap. */
  openCapPerMember: number;
  paused: boolean;
  missionDays: number;
}

export interface Business {
  id: string;
  name: string;
  plan: PlanName;
  /** Whop user who pays for the plan, checked against the ReviewLoop business's memberships. */
  billingUserId: string | null;
  planCheckedAt: string | null;
  settings: BusinessSettings;
  /** Public demo sandboxes only: last visit, so idle sandboxes can be cleared. */
  demoLastSeenAt?: string;
  createdAt: string;
}

export interface Member {
  key: string; // `${businessId}:${userId}`
  businessId: string;
  userId: string;
  name: string;
  firstSeenAt: string;
}

export interface Submission {
  id: string;
  businessId: string;
  experienceId: string;
  memberId: string;
  memberName: string;
  title: string;
  note: string;
  kind: SubmissionKind;
  url: string;
  durationSec: number | null;
  /** Where an uploaded file is stored. Missing on older submissions, which were all local. */
  storage?: "r2" | "local";
  forLiveSession: boolean;
  status: SubmissionStatus;
  scores: Record<string, number>;
  summary: string;
  reviewerId: string | null;
  reviewerName: string | null;
  createdAt: string;
  reviewedAt: string | null;
  resubmissionOf: string | null;
}

export interface Comment {
  id: string;
  submissionId: string;
  authorId: string;
  authorName: string;
  /** Seconds into the video, or null for a general comment. */
  t: number | null;
  text: string;
  createdAt: string;
}

export interface DB {
  businesses: Record<string, Business>;
  members: Record<string, Member>;
  submissions: Record<string, Submission>;
  comments: Record<string, Comment>;
}

const EMPTY: DB = { businesses: {}, members: {}, submissions: {}, comments: {} };

export const DEFAULT_SETTINGS: BusinessSettings = {
  rubric: ["Technique", "Clarity", "Creativity"],
  snippets: [
    "Great improvement here, keep this up.",
    "Watch your pacing at this point.",
    "Try this again and resubmit.",
  ],
  promiseHours: 72,
  openCapPerMember: 3,
  paused: false,
  missionDays: 7,
};

// Next.js can load this file more than once (pages and API routes are bundled separately),
// so nothing is cached in memory: every read goes to the file, and writes are queued on globalThis.
const g = globalThis as unknown as { __rlWriteQueue?: Promise<unknown> };

async function load(): Promise<DB> {
  try {
    return { ...EMPTY, ...JSON.parse(await fs.readFile(DB_FILE, "utf8")) } as DB;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY);
    throw err;
  }
}

async function save(db: DB) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, DB_FILE);
}

/** Read-only snapshot. */
export async function read<T>(fn: (db: DB) => T): Promise<T> {
  await g.__rlWriteQueue;
  return fn(await load());
}

/** Serialised write: runs one at a time, then saves. */
export function write<T>(fn: (db: DB) => T): Promise<T> {
  const run = (g.__rlWriteQueue ?? Promise.resolve()).then(async () => {
    const db = await load();
    const result = fn(db);
    await save(db);
    return result;
  });
  g.__rlWriteQueue = run.catch(() => undefined);
  return run;
}

export const newId = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

export async function ensureBusiness(id: string, name: string): Promise<Business> {
  const existing = await read((db) => db.businesses[id]);
  if (existing) return existing;
  return write((db) => {
    db.businesses[id] ??= {
      id,
      name,
      plan: "free",
      billingUserId: null,
      planCheckedAt: null,
      settings: structuredClone(DEFAULT_SETTINGS),
      createdAt: new Date().toISOString(),
    };
    return db.businesses[id];
  });
}

export async function ensureMember(businessId: string, userId: string, name: string): Promise<Member> {
  const key = `${businessId}:${userId}`;
  const existing = await read((db) => db.members[key]);
  if (existing && existing.name === name) return existing;
  return write((db) => {
    const m = (db.members[key] ??= { key, businessId, userId, name, firstSeenAt: new Date().toISOString() });
    m.name = name;
    return m;
  });
}
