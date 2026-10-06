import { NextResponse } from "next/server";
import { experienceCtx, fail, handler } from "@/lib/api";
import { isPublicDemo, MAX_UPLOAD_BYTES, MAX_VIDEO_SECONDS } from "@/lib/config";
import { detectKind, submissionBlocker } from "@/lib/reviews";
import { saveVideo, uploadTarget } from "@/lib/media";
import { sandboxFull } from "@/lib/sandbox";
import { newId, read, write, type Submission } from "@/lib/store";

const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-m4v": "m4v",
};

const DEMO_UPLOADS_OFF = "File uploads are off in this demo. Paste a YouTube or TikTok link instead.";

export const POST = handler(async (req: Request) => {
  // The public demo takes links only, so refuse big bodies before reading them.
  if (isPublicDemo && Number(req.headers.get("content-length") ?? 0) > 64_000) fail(413, DEMO_UPLOADS_OFF);
  const form = await req.formData();
  const experienceId = String(form.get("experienceId") ?? "");
  const { viewer, business, plan } = await experienceCtx(experienceId);

  const subs = await read((db) => Object.values(db.submissions));
  const blocker = submissionBlocker(subs, business, plan, viewer.userId);
  if (blocker) fail(409, blocker);
  const full = await sandboxFull(business.id, "submission");
  if (full) fail(429, full);

  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  const note = String(form.get("note") ?? "").trim().slice(0, 2000);
  const forLiveSession = form.get("forLiveSession") === "true";
  const resubmissionOf = String(form.get("resubmissionOf") ?? "") || null;
  if (!title) fail(400, "Give your video a short title.");

  const id = newId("sub");
  let kind: Submission["kind"];
  let url: string;
  let durationSec: number | null = Number(form.get("durationSec")) || null;
  let storage: Submission["storage"];

  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    const ext = VIDEO_TYPES[file.type];
    if (!ext) fail(400, "Please upload an MP4, MOV or WebM video.");
    if (file.size > MAX_UPLOAD_BYTES) fail(400, "That file is too big. Keep videos under 250 MB.");
    if (durationSec && durationSec > MAX_VIDEO_SECONDS + 1) fail(400, "Videos can be up to 3 minutes long.");
    const target = uploadTarget();
    if (!target) fail(503, isPublicDemo ? DEMO_UPLOADS_OFF : "Video uploads aren't switched on yet. Paste a YouTube or TikTok link for now.");
    const name = `${id}.${ext}`;
    await saveVideo(target, name, Buffer.from(await file.arrayBuffer()), file.type);
    storage = target;
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
    storage,
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
