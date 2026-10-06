import { NextResponse } from "next/server";
import { experienceCtx, fail, handler } from "@/lib/api";
import { sandboxFull } from "@/lib/sandbox";
import { newId, read, write, type Comment } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

/** Coaches leave timestamped feedback; the member who submitted can reply with general comments. */
export const POST = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const body = (await req.json()) as { experienceId?: string; t?: number | null; text?: string };
  const { viewer, business } = await experienceCtx(body.experienceId);

  const sub = await read((db) => db.submissions[id]);
  if (!sub || sub.businessId !== business.id) fail(404, "Submission not found.");
  if (viewer.role !== "coach" && sub.memberId !== viewer.userId) fail(403, "You can only comment on your own videos.");

  const text = String(body.text ?? "").trim().slice(0, 2000);
  if (!text) fail(400, "Write a comment first.");
  const full = await sandboxFull(business.id, "comment");
  if (full) fail(429, full);
  const t = viewer.role === "coach" && typeof body.t === "number" && body.t >= 0 ? Math.round(body.t * 10) / 10 : null;

  const comment: Comment = {
    id: newId("cmt"),
    submissionId: id,
    authorId: viewer.userId,
    authorName: viewer.name,
    t,
    text,
    createdAt: new Date().toISOString(),
  };
  await write((db) => {
    db.comments[comment.id] = comment;
  });
  return NextResponse.json({ comment });
});
