import { NextResponse } from "next/server";
import { experienceCtx, fail, handler } from "@/lib/api";
import { PLANS } from "@/lib/config";
import { coachBlocker } from "@/lib/reviews";
import { read, write, type SubmissionStatus } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

/** Coach saves a review: status, rubric scores and a summary. */
export const PATCH = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const body = (await req.json()) as {
    experienceId?: string;
    status?: SubmissionStatus;
    scores?: Record<string, number>;
    summary?: string;
  };
  const { viewer, business, plan } = await experienceCtx(body.experienceId);
  if (viewer.role !== "coach") fail(403, "Only coaches can review.");

  const all = await read((db) => Object.values(db.submissions));
  const sub = all.find((s) => s.id === id && s.businessId === business.id);
  if (!sub) fail(404, "Submission not found.");
  const seat = coachBlocker(all, business.id, plan, viewer.userId);
  if (seat && sub.reviewerId !== viewer.userId) fail(402, seat);

  if (body.status && !["queued", "reviewed", "needs_revision"].includes(body.status)) fail(400, "Unknown status.");

  const updated = await write((db) => {
    const s = db.submissions[id];
    if (body.summary !== undefined) s.summary = String(body.summary).slice(0, 4000);
    if (body.scores && PLANS[plan].rubrics) {
      const allowed = new Set(business.settings.rubric);
      s.scores = Object.fromEntries(
        Object.entries(body.scores)
          .filter(([k, v]) => allowed.has(k) && Number.isFinite(v))
          .map(([k, v]) => [k, Math.min(5, Math.max(1, Math.round(v)))]),
      );
    }
    if (body.status) {
      s.status = body.status;
      if (body.status === "queued") {
        s.reviewedAt = null;
      } else {
        s.reviewedAt = new Date().toISOString();
        s.reviewerId = viewer.userId;
        s.reviewerName = viewer.name;
      }
    }
    return s;
  });
  return NextResponse.json({ submission: updated });
});
