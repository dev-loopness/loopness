import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { experienceCtx, fail, handler } from "@/lib/api";
import { read, UPLOAD_DIR } from "@/lib/store";

type Params = { params: Promise<{ file: string }> };

const TYPES: Record<string, string> = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", m4v: "video/x-m4v" };

/** Streams an uploaded video (with seeking support) to people in the same community. */
export const GET = handler(async (req: Request, { params }: Params) => {
  const { file } = await params;
  if (!/^sub_[a-f0-9]+\.(mp4|mov|webm|m4v)$/.test(file)) fail(404, "Not found.");
  const subId = file.split(".")[0];
  const sub = await read((db) => db.submissions[subId]);
  if (!sub) fail(404, "Not found.");
  const { viewer, business } = await experienceCtx(new URL(req.url).searchParams.get("e") ?? sub.experienceId);
  if (business.id !== sub.businessId) fail(403, "No access.");
  if (viewer.role !== "coach" && viewer.userId !== sub.memberId) fail(403, "No access.");

  const full = path.join(UPLOAD_DIR, file);
  const { size } = await fs.stat(full).catch(() => fail(404, "Not found."));
  const type = TYPES[file.split(".")[1]];
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const stream = Readable.toWeb(createReadStream(full, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: {
        "Content-Type": type,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
      },
    });
  }
  const stream = Readable.toWeb(createReadStream(full)) as ReadableStream;
  return new Response(stream, { headers: { "Content-Type": type, "Content-Length": String(size), "Accept-Ranges": "bytes" } });
});
