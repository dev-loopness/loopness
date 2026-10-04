import { NextResponse } from "next/server";
import { experienceCtx, fail, handler } from "@/lib/api";
import { read, write } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export const DELETE = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const experienceId = new URL(req.url).searchParams.get("experienceId");
  const { viewer } = await experienceCtx(experienceId);
  const c = await read((db) => db.comments[id]);
  if (!c) fail(404, "Comment not found.");
  if (c.authorId !== viewer.userId) fail(403, "You can only delete your own comments.");
  await write((db) => {
    delete db.comments[id];
  });
  return NextResponse.json({ ok: true });
});
