// Public demo sandboxes.
// Each visitor to the public demo gets a private sample community, keyed by a random cookie
// (set in proxy.ts), so prospects never see each other's clicks. Sandboxes start with sample
// videos and feedback, are cleared after 24 idle hours, and are capped in number and size.

import "server-only";
import { cookies } from "next/headers";
import { config } from "./config";
import { detectKind } from "./reviews";
import { DEFAULT_SETTINGS, newId, read, write, type Comment, type DB, type Submission } from "./store";

export const SANDBOX_COOKIE = "rl_sandbox";
export const SANDBOX_ID = /^[a-f0-9]{16}$/;
export const SANDBOX_NAME = "Your Community";

const PREFIX = "biz_demo_";
const IDLE_MS = 24 * 60 * 60_000;
const TOUCH_MS = 10 * 60_000;
const MAX_SANDBOXES = 500;
// Totals include the ~23 sample videos and ~30 sample notes each sandbox starts with.
const MAX_SUBMISSIONS = 40;
const MAX_COMMENTS = 120;

export const sandboxBusinessId = (sid: string) => `${PREFIX}${sid}`;

/** The visitor's sandbox id. proxy.ts always sets the cookie; the fallback only covers odd clients. */
export async function currentSandbox(): Promise<string> {
  const v = (await cookies()).get(SANDBOX_COOKIE)?.value;
  return v && SANDBOX_ID.test(v) ? v : "0".repeat(16);
}

/** Make sure the visitor's sandbox exists (seeding it on first visit) and mark it as recently used. */
export async function ensureSandbox(sid: string, experienceId: string): Promise<void> {
  const id = sandboxBusinessId(sid);
  const seen = await read((db) => db.businesses[id]?.demoLastSeenAt);
  if (seen && Date.now() - Date.parse(seen) < TOUCH_MS) return;
  await write((db) => {
    const now = new Date().toISOString();
    const b = db.businesses[id];
    if (b) {
      b.demoLastSeenAt = now;
      return;
    }
    prune(db);
    seed(db, id, experienceId);
  });
}

/** Stops one visitor from filling the demo's disk. Returns why they can't add more, or null. */
export async function sandboxFull(businessId: string, kind: "submission" | "comment"): Promise<string | null> {
  if (!businessId.startsWith(PREFIX)) return null;
  const count = await read((db) => {
    const subs = Object.values(db.submissions).filter((s) => s.businessId === businessId);
    if (kind === "submission") return subs.length;
    const ids = new Set(subs.map((s) => s.id));
    return Object.values(db.comments).filter((c) => ids.has(c.submissionId)).length;
  });
  const max = kind === "submission" ? MAX_SUBMISSIONS : MAX_COMMENTS;
  return count >= max ? `This demo holds up to ${max} ${kind === "submission" ? "videos" : "comments"}. It starts fresh after a day away.` : null;
}

/** Remove sandboxes idle for 24 hours, then the oldest ones until there is room for one more. */
function prune(db: DB) {
  const now = Date.now();
  const lastSeen = (id: string) => Date.parse(db.businesses[id].demoLastSeenAt ?? db.businesses[id].createdAt);
  const boxes = Object.keys(db.businesses).filter((id) => id.startsWith(PREFIX));
  const gone = new Set(boxes.filter((id) => now - lastSeen(id) > IDLE_MS));
  const alive = boxes.filter((id) => !gone.has(id)).sort((a, b) => lastSeen(a) - lastSeen(b));
  while (alive.length >= MAX_SANDBOXES) gone.add(alive.shift()!);
  if (!gone.size) return;

  const subIds = new Set<string>();
  for (const s of Object.values(db.submissions)) {
    if (gone.has(s.businessId)) {
      subIds.add(s.id);
      delete db.submissions[s.id];
    }
  }
  for (const c of Object.values(db.comments)) if (subIds.has(c.submissionId)) delete db.comments[c.id];
  for (const m of Object.values(db.members)) if (gone.has(m.businessId)) delete db.members[m.key];
  for (const id of gone) delete db.businesses[id];
}

const PEOPLE = {
  coach: { id: "user_demo_coach", name: "Marisol Ortega" },
  coach2: { id: "user_demo_coach2", name: "Dev Kapoor" },
  alex: { id: "user_demo_alex", name: "Tobiah Wren" },
  jo: { id: "user_demo_jo", name: "Ines Achterberg" },
};

/** Sample videos: the links set in PUBLIC_DEMO_VIDEOS, or the short clips bundled in public/demo. */
function video(i: number): Pick<Submission, "kind" | "url" | "durationSec"> {
  const links = config.demoVideos;
  if (links.length) {
    const url = links[i % links.length];
    return { kind: detectKind(url), url, durationSec: null };
  }
  return { kind: "upload", url: `/demo/sample-${(i % 3) + 1}.mp4`, durationSec: 20 };
}

function seed(db: DB, businessId: string, experienceId: string) {
  const now = Date.now();
  const ago = (hours: number) => new Date(now - hours * 3_600_000).toISOString();

  db.businesses[businessId] = {
    id: businessId,
    name: SANDBOX_NAME,
    plan: "pro",
    billingUserId: null,
    planCheckedAt: null,
    settings: structuredClone(DEFAULT_SETTINGS),
    createdAt: ago(0),
    demoLastSeenAt: ago(0),
  };
  for (const [i, p] of Object.values(PEOPLE).entries()) {
    const key = `${businessId}:${p.id}`;
    db.members[key] = { key, businessId, userId: p.id, name: p.name, firstSeenAt: ago(240 - i) };
  }

  type Seed = {
    member: keyof typeof PEOPLE;
    title: string;
    note?: string;
    video: number;
    hoursAgo: number;
    live?: boolean;
    review?: {
      by: keyof typeof PEOPLE;
      afterHours: number;
      status: "reviewed" | "needs_revision";
      scores: [number, number, number];
      summary: string;
      notes: [number, string][];
    };
  };

  const samples: Seed[] = [
    { member: "jo", title: "Reel edit, second cut", note: "Does the pacing drag in the middle?", video: 1, hoursAgo: 2, live: true },
    { member: "alex", title: "Guitar solo, take 3", note: "Timing on the bend feels late to me.", video: 2, hoursAgo: 5 },
    { member: "jo", title: "Back squat, top set", note: "Knees cave in on the way up.", video: 0, hoursAgo: 9, live: true },
    {
      member: "alex",
      title: "Back squat, week 3",
      note: "Is my depth OK now?",
      video: 0,
      hoursAgo: 30,
      review: {
        by: "coach",
        afterHours: 6,
        status: "needs_revision",
        scores: [3, 4, 4],
        summary: "Depth is there now. Brace harder before you descend and send a new set next week.",
        notes: [
          [3, "Big breath and brace here, before the bar moves."],
          [8, "Knees drift inward on the way up. Push them out over your toes."],
          [14, "Depth is right where it should be. Keep this."],
        ],
      },
    },
    {
      member: "jo",
      title: "Reel edit, first cut",
      video: 1,
      hoursAgo: 52,
      review: {
        by: "coach2",
        afterHours: 10,
        status: "reviewed",
        scores: [4, 5, 4],
        summary: "Strong hook. Trim the intro by a second and this is ready to post.",
        notes: [
          [2, "Great hook, it grabs attention straight away."],
          [11, "This cut lands a beat late. Move it to the snare."],
        ],
      },
    },
  ];
  // Enough recent history that the wait estimate and dashboard look like a busy community.
  const history = [
    "Deadlift lockout", "Chord changes, verse", "Color grade pass", "Bench press setup", "Strumming pattern", "Overhead press",
    "Thumbnail edit", "Fingerpicking drill", "Front squat", "Intro hook, cut 1", "Scale run, slow", "Romanian deadlift",
    "Sound design pass", "Barre chords", "Pull-up form", "Captions timing", "Vibrato drill", "Hip thrust",
  ];
  history.forEach((title, i) =>
    samples.push({
      member: i % 2 ? "alex" : "jo",
      title,
      video: i % 3,
      hoursAgo: 14 + i * 7,
      review: {
        by: i % 3 ? "coach" : "coach2",
        afterHours: 4 + (i % 4) * 3,
        status: "reviewed",
        scores: [4, 3 + (i % 3), 4],
        summary: "Solid progress. Keep the same focus next session.",
        notes: [[5, "Nice control through this part."]],
      },
    }),
  );

  const rubric = DEFAULT_SETTINGS.rubric;
  for (const s of samples) {
    const id = newId("sub");
    const member = PEOPLE[s.member];
    const reviewer = s.review ? PEOPLE[s.review.by] : null;
    const reviewedAt = s.review ? ago(s.hoursAgo - s.review.afterHours) : null;
    db.submissions[id] = {
      id,
      businessId,
      experienceId,
      memberId: member.id,
      memberName: member.name,
      title: s.title,
      note: s.note ?? "",
      ...video(s.video),
      forLiveSession: Boolean(s.live),
      status: s.review?.status ?? "queued",
      scores: s.review ? Object.fromEntries(rubric.map((r, i) => [r, s.review!.scores[i]])) : {},
      summary: s.review?.summary ?? "",
      reviewerId: reviewer?.id ?? null,
      reviewerName: reviewer?.name ?? null,
      createdAt: ago(s.hoursAgo),
      reviewedAt,
      resubmissionOf: null,
    };
    for (const [t, text] of s.review?.notes ?? []) {
      const c: Comment = { id: newId("cmt"), submissionId: id, authorId: reviewer!.id, authorName: reviewer!.name, t, text, createdAt: reviewedAt! };
      db.comments[c.id] = c;
    }
  }
}
