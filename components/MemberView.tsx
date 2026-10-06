"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, FilmStrip, Target, UploadSimple, WarningCircle, X } from "@phosphor-icons/react/dist/ssr";
import type { Comment, Submission } from "@/lib/store";
import { formatTime } from "@/lib/reviews";
import { api, hoursLabel } from "@/lib/client";
import { SubmissionDetail } from "./SubmissionDetail";
import { StatusPill } from "./StatusPill";
import { Time } from "./Time";

const MAX_SECONDS = 180;
const sizeFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

function videoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(Number.isFinite(v.duration) ? v.duration : null);
    };
    v.onerror = () => resolve(null);
    v.src = URL.createObjectURL(file);
  });
}

export function MemberView({
  experienceId,
  mine,
  comments,
  positions,
  waitHours,
  promiseHours,
  blocker,
  mission,
  liveEnabled,
  uploadsEnabled,
  uploadsOffNote,
}: {
  experienceId: string;
  mine: Submission[];
  comments: Comment[];
  positions: Record<string, number>;
  waitHours: number | null;
  promiseHours: number;
  blocker: string | null;
  mission: { daysLeft: number } | null;
  liveEnabled: boolean;
  uploadsEnabled: boolean;
  /** Shown above the link field when uploads are off. */
  uploadsOffNote?: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"upload" | "link">(uploadsEnabled ? "upload" : "link");
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [forLive, setForLive] = useState(false);
  const [resubmissionOf, setResubmissionOf] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const tooLong = mode === "upload" && duration !== null && duration > MAX_SECONDS + 1;

  const pickFile = async (f: File | null) => {
    setError(null);
    setFile(f);
    setDuration(null);
    if (!f) return;
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 120));
    setDuration(await videoDuration(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (tooLong) return;
    if (mode === "upload" && !file) return setError("Choose a video file first.");
    if (mode === "link" && !url) return setError("Paste a link to your video first.");
    const form = new FormData();
    form.set("experienceId", experienceId);
    form.set("title", title);
    form.set("note", note);
    form.set("forLiveSession", String(forLive));
    if (resubmissionOf) form.set("resubmissionOf", resubmissionOf);
    if (mode === "upload" && file) {
      form.set("file", file);
      if (duration) form.set("durationSec", String(Math.round(duration)));
    } else form.set("url", url);
    setBusy(true);
    try {
      await api("/api/submissions", { method: "POST", body: form });
      setTitle("");
      setNote("");
      setUrl("");
      setFile(null);
      setDuration(null);
      setForLive(false);
      setResubmissionOf(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const overPromise = waitHours !== null && waitHours > promiseHours;
  const open = mine.find((s) => s.id === openId);
  const resubTarget = mine.find((s) => s.id === resubmissionOf);

  if (open) {
    return (
      <>
        <div className="row" style={{ marginBottom: 16 }}>
          <button className="btn-ghost" onClick={() => setOpenId(null)}>
            <ArrowLeft size={14} aria-hidden="true" />
            My Videos
          </button>
          <span className="spacer" />
          {open.status === "needs_revision" && (
            <button
              className="btn-primary"
              onClick={() => {
                setResubmissionOf(open.id);
                setTitle(`${open.title} (v2)`);
                setOpenId(null);
              }}
            >
              <UploadSimple size={14} weight="bold" aria-hidden="true" />
              Send New Version
            </button>
          )}
        </div>
        <SubmissionDetail key={open.id} submission={open} comments={comments.filter((c) => c.submissionId === open.id)} experienceId={experienceId} mode="member" />
      </>
    );
  }

  return (
    <>
      {mission && (
        <div className="banner accent">
          <Target size={16} weight="bold" aria-hidden="true" style={{ color: "var(--accent)" }} />
          <p>
            <strong>Your first video is due in {mission.daysLeft} day{mission.daysLeft === 1 ? "" : "s"}.</strong> Send anything you&apos;re working on, even a rough take. Early feedback is where most progress happens.
          </p>
        </div>
      )}

      <div className="split">
        <form className="surface pad" onSubmit={submit} noValidate>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
            <h2>{resubTarget ? "Send a new version" : "Get feedback on a video"}</h2>
            {!blocker && (
              <span className="wait" title={`Your coach aims to review within ${promiseHours} hours`}>
                <Clock size={14} aria-hidden="true" />
                <span>
                  {overPromise ? "Running late: " : "Wait: "}
                  {hoursLabel(waitHours ?? promiseHours)}
                </span>
              </span>
            )}
          </div>

          {resubTarget && (
            <div className="banner">
              <p className="small">
                Replying to your coach&apos;s notes on <strong>{resubTarget.title}</strong>.
              </p>
              <span className="spacer" />
              <button type="button" className="btn-ghost btn-icon" style={{ height: 22, width: 22 }} aria-label="Cancel new version" onClick={() => (setResubmissionOf(null), setTitle(""))}>
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          {blocker ? (
            <div className="banner warn" role="status">
              <WarningCircle size={16} weight="bold" aria-hidden="true" />
              <p>{blocker}</p>
            </div>
          ) : (
            <>
              <div className="segmented" role="group" aria-label="How to send your video" style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  aria-pressed={mode === "upload"}
                  onClick={() => setMode("upload")}
                  disabled={!uploadsEnabled}
                  title={uploadsEnabled ? undefined : (uploadsOffNote ?? "File uploads are coming soon. Paste a link for now.")}
                >
                  Upload File
                </button>
                <button type="button" aria-pressed={mode === "link"} onClick={() => setMode("link")}>
                  Paste Link
                </button>
              </div>

              {mode === "upload" ? (
                file ? (
                  <div className="file">
                    <FilmStrip size={20} aria-hidden="true" style={{ color: "var(--muted)", flex: "none" }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="name truncate">{file.name}</div>
                      <div className="xs muted num">
                        {sizeFmt.format(file.size / 1024 / 1024)}&nbsp;MB
                        {duration !== null && `, ${formatTime(duration)}`}
                      </div>
                    </div>
                    <button type="button" className="btn-ghost btn-icon" aria-label="Remove file" onClick={() => pickFile(null)}>
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <label
                    className="drop"
                    data-over={over}
                    onDragOver={(e) => (e.preventDefault(), setOver(true))}
                    onDragLeave={() => setOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setOver(false);
                      void pickFile(e.dataTransfer.files?.[0] ?? null);
                    }}
                  >
                    <UploadSimple size={22} aria-hidden="true" />
                    <strong>Drop a video here, or click to choose</strong>
                    <span className="xs">MP4, MOV or WebM, up to 3 minutes</span>
                    <input type="file" name="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                  </label>
                )
              ) : (
                <div className="field">
                  {!uploadsEnabled && uploadsOffNote && <p className="small muted" style={{ marginBottom: 8 }}>{uploadsOffNote}</p>}
                  <label htmlFor="video-url">Video link</label>
                  <input
                    id="video-url"
                    type="url"
                    name="url"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="https://youtube.com/watch?v=…"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <span className="hint">YouTube and TikTok links get timestamped feedback. Other links get general notes.</span>
                </div>
              )}
              {tooLong && (
                <p className="error" style={{ marginTop: 8 }} role="alert">
                  <WarningCircle size={14} weight="bold" aria-hidden="true" />
                  This video is {formatTime(duration!)} long. Trim it to 3 minutes or less, or send the part you want feedback on.
                </p>
              )}

              <div className="field" style={{ marginTop: 16 }}>
                <label htmlFor="video-title">Title</label>
                <input id="video-title" type="text" name="title" autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Squat, week 3…" maxLength={120} />
              </div>
              <div className="field">
                <label htmlFor="video-note">
                  What should your coach look at? <span className="faint">(optional)</span>
                </label>
                <textarea id="video-note" name="note" autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} placeholder="My knees cave in on the way up…" />
              </div>
              {liveEnabled && (
                <label className="check">
                  <input type="checkbox" name="forLiveSession" checked={forLive} onChange={(e) => setForLive(e.target.checked)} />
                  <span>
                    Review this on the next live call
                    <span className="hint" style={{ display: "block" }}>
                      Your coach goes through flagged videos together on the call.
                    </span>
                  </span>
                </label>
              )}
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn-primary btn-lg" disabled={busy || tooLong || !title.trim()}>
                  {busy ? "Sending…" : "Send for Review"}
                  {!busy && <ArrowRight size={16} weight="bold" aria-hidden="true" />}
                </button>
              </div>
              <div aria-live="polite">
                {error && (
                  <p className="error" style={{ marginTop: 10 }}>
                    <WarningCircle size={14} weight="bold" aria-hidden="true" />
                    {error}
                  </p>
                )}
              </div>
            </>
          )}
        </form>

        <section className="surface" aria-labelledby="my-videos">
          <div className="rail-head">
            <h2 id="my-videos" style={{ fontSize: 14 }}>
              My videos
            </h2>
            <span className="xs faint num">{mine.length}</span>
          </div>
          {mine.length === 0 ? (
            <div className="empty">
              <FilmStrip size={28} aria-hidden="true" />
              <p>Videos you send show up here, with your coach&apos;s notes pinned to the exact moments.</p>
            </div>
          ) : (
            <ul className="videos">
              {mine.map((s) => {
                const n = comments.filter((c) => c.submissionId === s.id).length;
                return (
                  <li key={s.id}>
                    <button className="item" onClick={() => setOpenId(s.id)}>
                      <span className="truncate" style={{ fontWeight: 500 }}>
                        {s.title}
                      </span>
                      <StatusPill status={s.status} />
                      <span className="meta">
                        Sent <Time iso={s.createdAt} />
                        {s.status === "queued" && positions[s.id] ? <span className="num">, number {positions[s.id]} in line</span> : null}
                        {s.status !== "queued" && <span className="num">, {n} {n === 1 ? "note" : "notes"} from {s.reviewerName ?? "your coach"}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
