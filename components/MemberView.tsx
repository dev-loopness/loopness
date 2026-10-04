"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Comment, Submission } from "@/lib/store";
import { api, hoursLabel, STATUS_LABEL, timeAgo } from "@/lib/client";
import { SubmissionDetail } from "./SubmissionDetail";

const MAX_SECONDS = 180;

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
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [forLive, setForLive] = useState(false);
  const [resubmissionOf, setResubmissionOf] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const pickFile = async (f: File | null) => {
    setError(null);
    setFile(f);
    setDuration(null);
    if (!f) return;
    const d = await videoDuration(f);
    setDuration(d);
    if (d && d > MAX_SECONDS + 1) setError("That video is longer than 3 minutes. Trim it, or send the part you want feedback on.");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "upload" && duration && duration > MAX_SECONDS + 1) return;
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
      setForLive(false);
      setResubmissionOf(null);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const shownWait = waitHours ?? promiseHours;
  const overPromise = waitHours !== null && waitHours > promiseHours;
  const open = mine.find((s) => s.id === openId);

  return (
    <>
      {mission && (
        <div className="notice">
          <strong>Your first mission:</strong> send your first video for feedback in the next {mission.daysLeft} day
          {mission.daysLeft === 1 ? "" : "s"}. Members who get early feedback improve fastest.
        </div>
      )}

      {open ? (
        <div className="panel">
          <button onClick={() => setOpenId(null)} style={{ marginBottom: 12 }}>
            ← Back to my videos
          </button>
          <SubmissionDetail key={open.id} submission={open} comments={comments.filter((c) => c.submissionId === open.id)} experienceId={experienceId} mode="member" />
          {open.status === "needs_revision" && (
            <button
              className="primary"
              style={{ marginTop: 12 }}
              onClick={() => {
                setResubmissionOf(open.id);
                setTitle(`${open.title} (v2)`);
                setOpenId(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Send a new version
            </button>
          )}
        </div>
      ) : (
        <div className="grid2">
          <form className="panel" onSubmit={submit}>
            <h2>{resubmissionOf ? "Send a new version" : "Get feedback on a video"}</h2>
            {blocker ? (
              <div className="notice warn">{blocker}</div>
            ) : (
              <p className="muted small">
                {overPromise ? "Reviews are taking longer than usual right now: " : "Current wait for a review: "}
                {hoursLabel(shownWait)}.
              </p>
            )}
            <div className="tabs">
              <button type="button" aria-pressed={mode === "upload"} onClick={() => setMode("upload")}>
                Upload a video
              </button>
              <button type="button" aria-pressed={mode === "link"} onClick={() => setMode("link")}>
                Paste a link
              </button>
            </div>
            {mode === "upload" ? (
              <>
                <label>Video file (up to 3 minutes)</label>
                <input type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
              </>
            ) : (
              <>
                <label>YouTube or TikTok link (other links work too, without timestamps)</label>
                <input type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
              </>
            )}
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Squat form, week 3" maxLength={120} required />
            <label>What do you want feedback on? (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. My knees cave in on the way up" />
            {liveEnabled && (
              <label className="inline" style={{ marginTop: 10 }}>
                <input type="checkbox" checked={forLive} onChange={(e) => setForLive(e.target.checked)} />
                Review this on the next live call
              </label>
            )}
            <div className="row" style={{ marginTop: 12 }}>
              <button className="primary" disabled={busy || !!blocker || (mode === "upload" ? !file : !url)}>
                {busy ? "Sending…" : "Send for review"}
              </button>
              {resubmissionOf && (
                <button type="button" onClick={() => (setResubmissionOf(null), setTitle(""))}>
                  Cancel
                </button>
              )}
            </div>
            {error && <div className="error">{error}</div>}
          </form>

          <div className="panel">
            <h2>My videos</h2>
            {mine.length === 0 && <p className="muted small">Nothing yet. Your videos and your coach&apos;s feedback will show up here.</p>}
            <ul className="list">
              {mine.map((s) => (
                <li key={s.id} className="selectable" onClick={() => setOpenId(s.id)}>
                  <div className="row between">
                    <strong className="small">{s.title}</strong>
                    <span className={`badge ${s.status === "reviewed" ? "ok" : s.status === "needs_revision" ? "warn" : ""}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </div>
                  <div className="muted small">
                    Sent {timeAgo(s.createdAt)}
                    {s.status === "queued" && positions[s.id] ? ` · number ${positions[s.id]} in the queue` : ""}
                    {s.status !== "queued" && s.reviewerName ? ` · reviewed by ${s.reviewerName}` : ""}
                    {` · ${comments.filter((c) => c.submissionId === s.id).length} comments`}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
