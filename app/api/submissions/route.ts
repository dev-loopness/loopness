import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { experienceCtx, fail, handler } from "@/lib/api";
import { MAX_UPLOAD_BYTES, MAX_VIDEO_SECONDS } from "@/lib/config";
import { detectKind, submissionBlocker } from "@/lib/reviews";
import { newId, read, UPLOAD_DIR, write, type Submission } from "@/lib/store";

const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-m4v": "m4v",
};

export const POST = handler(async (req: Request) => {
  const form = await req.formData();
  const experienceId = String(form.get("experienceId") ?? "");
  const { viewer, business, plan } = await experienceCtx(experienceId);

  const subs = await read((db) => Object.values(db.submissions));
  const blocker = submissionBlocker(subs, business, plan, viewer.userId);
  if (blocker) fail(409, blocker);

  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  const note = String(form.get("note") ?? "").trim().slice(0, 2000);
  const forLiveSession = form.get("forLiveSession") === "true";
  const resubmissionOf = String(form.get("resubmissionOf") ?? "") || null;
  if (!title) fail(400, "Give your video a short title.");

  const id = newId("sub");
  let kind: Submission["kind"];
  let url: string;
  let durationSec: number | null = Number(form.get("durationSec")) || null;

  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    const ext = VIDEO_TYPES[file.type];
    if (!ext) fail(400, "Please upload an MP4, MOV or WebM video.");
    if (file.size > MAX_UPLOAD_BYTES) fail(400, "That file is too big. Keep videos under 250 MB.");
    if (durationSec && durationSec > MAX_VIDEO_SECONDS + 1) fail(400, "Videos can be up to 3 minutes long.");
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const name = `${id}.${ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
    kind = "upload";
    url = `/api/media/${name}`;
  } else {
    url = String(form.get("url") ?? "").trim();
    if (!/^https?:\/\//i.test(url)) fail(400, "Add a video file or paste a link that starts with https://");
    kind = detectKind(url);
    durationSec = null;
  }

  const submission: Submission = {
    id,
    businessId: business.id,
    experienceId,
    memberId: viewer.userId,
    memberName: viewer.name,
    title,
    note,
    kind,
    url,
    durationSec,
    forLiveSession,
    status: "queued",
    scores: {},
    summary: "",
    reviewerId: null,
    reviewerName: null,
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    resubmissionOf,
  };
  await write((db) => {
    db.submissions[id] = submission;
  });
  return NextResponse.json({ submission });
});
