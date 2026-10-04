"use client";

// One submission: the video, its timestamped comments, and (for coaches) the review tools.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Comment, Submission, SubmissionStatus } from "@/lib/store";
import { formatTime } from "@/lib/reviews";
import { api, STATUS_LABEL, timeAgo } from "@/lib/client";
import { VideoPlayer, type PlayerHandle } from "./VideoPlayer";

export interface ReviewTools {
  rubric: string[];
  snippets: string[];
  rubricsEnabled: boolean;
  seatBlocker: string | null;
}

function parseTime(s: string): number | null {
  const m = s.trim().match(/^(?:(\d+):)?(\d{1,2})$/);
  if (!m) return null;
  return Number(m[1] ?? 0) * 60 + Number(m[2]);
}

export function SubmissionDetail({
  submission: sub,
  comments,
  experienceId,
  mode,
  tools,
  onDone,
  compact,
}: {
  submission: Submission;
  comments: Comment[];
  experienceId: string;
  mode: "coach" | "member";
  tools?: ReviewTools;
  /** Called after a coach marks the submission reviewed / needs revision. */
  onDone?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const player = useRef<PlayerHandle | null>(null);
  const [text, setText] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [scores, setScores] = useState<Record<string, number>>(sub.scores);
  const [summary, setSummary] = useState(sub.summary);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...comments].sort((a, b) => (a.t ?? Infinity) - (b.t ?? Infinity) || a.createdAt.localeCompare(b.createdAt));
  const coach = mode === "coach";

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** "now" = at the typed time if any, else the player's current time. "general" = no timestamp. */
  const addComment = (body: string, when: "now" | "general") =>
    run(async () => {
      let t: number | null = null;
      if (coach && when === "now") {
        t = (timeInput ? parseTime(timeInput) : null) ?? player.current?.getTime() ?? null;
      }
      await api(`/api/submissions/${sub.id}/comments`, { method: "POST", json: { experienceId, t, text: body } });
      setText("");
      setTimeInput("");
    });

  const save = (status?: SubmissionStatus) =>
    run(async () => {
      await api(`/api/submissions/${sub.id}`, { method: "PATCH", json: { experienceId, status, scores, summary } });
    }).then((ok) => ok && status && status !== "queued" && onDone?.());

  const remove = (id: string) => run(() => api(`/api/comments/${id}?experienceId=${experienceId}`, { method: "DELETE" }));

  return (
    <div className={compact ? "" : "review-grid"}>
      <div>
        <VideoPlayer kind={sub.kind} url={sub.url} experienceId={experienceId} handle={player} />
        <div className="row between" style={{ marginTop: 10 }}>
          <div>
            <h2 style={{ margin: 0 }}>{sub.title}</h2>
            <span className="muted small">
              {sub.memberName} · sent {timeAgo(sub.createdAt)}
              {sub.durationSec ? ` · ${formatTime(sub.durationSec)}` : ""}
              {sub.forLiveSession ? " · for the live call" : ""}
              {sub.resubmissionOf ? " · resubmission" : ""}
            </span>
          </div>
          <span className={`badge ${sub.status === "reviewed" ? "ok" : sub.status === "needs_revision" ? "warn" : ""}`}>
            {STATUS_LABEL[sub.status]}
          </span>
        </div>
        {sub.note && <p style={{ marginTop: 8 }}>&ldquo;{sub.note}&rdquo;</p>}
      </div>

      <div>
        {coach && tools?.seatBlocker && <div className="notice warn">{tools.seatBlocker}</div>}

        <h3>Feedback</h3>
        {sorted.length === 0 && <p className="muted small">{coach ? "No comments yet. Pause the video and add one." : "No feedback yet."}</p>}
        <div>
          {sorted.map((c) => (
            <div className="comment" key={c.id}>
              {c.t !== null && (
                <button className="ts" onClick={() => player.current?.seek(c.t!)} title="Jump to this moment">
                  {formatTime(c.t)}
                </button>
              )}
              <span>{c.text}</span>
              <div className="muted small">
                {c.authorName}
                {c.authorId === sub.memberId ? " (member)" : ""} ·{" "}
                {timeAgo(c.createdAt)}
                {coach && c.authorId !== sub.memberId && (
                  <>
                    {" · "}
                    <a href="#" onClick={(e) => (e.preventDefault(), remove(c.id))}>
                      delete
                    </a>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10 }}>
          <textarea
            placeholder={coach ? "Pause the video and type feedback for this moment…" : "Reply to your coach…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {coach && tools && tools.snippets.length > 0 && (
            <div className="row" style={{ marginTop: 6 }}>
              {tools.snippets.map((s) => (
                <button key={s} className="chip" title="Add this saved comment at the current time" onClick={() => addComment(s, "now")} disabled={busy}>
                  {s.length > 34 ? s.slice(0, 32) + "…" : s}
                </button>
              ))}
            </div>
          )}
          <div className="row" style={{ marginTop: 8 }}>
            {coach ? (
              <>
                <button className="primary" disabled={busy || !text.trim()} onClick={() => addComment(text, "now")}>
                  Add at current time
                </button>
                <input
                  style={{ width: 90 }}
                  placeholder="or 1:05"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  aria-label="Timestamp"
                />
                <button disabled={busy || !text.trim()} onClick={() => addComment(text, "general")}>
                  General comment
                </button>
              </>
            ) : (
              <button className="primary" disabled={busy || !text.trim()} onClick={() => addComment(text, "general")}>
                Send reply
              </button>
            )}
          </div>
        </div>

        {(coach || Object.keys(sub.scores).length > 0 || sub.summary) && <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />}

        {tools?.rubricsEnabled && coach && tools.rubric.length > 0 && (
          <>
            <h3>Scores</h3>
            <div className="rubric">
              {tools.rubric.map((r) => (
                <div key={r} style={{ display: "contents" }}>
                  <span>{r}</span>
                  <span className="dots">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} className={`chip${scores[r] === n ? " active" : ""}`} onClick={() => setScores({ ...scores, [r]: n })}>
                        {n}
                      </button>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        {coach && tools && !tools.rubricsEnabled && <p className="muted small">Rubric scores come with the Pro plan.</p>}

        {!coach && Object.keys(sub.scores).length > 0 && (
          <>
            <h3>Scores</h3>
            <div className="rubric">
              {Object.entries(sub.scores).map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <span>{k}</span>
                  <b>{v} / 5</b>
                </div>
              ))}
            </div>
          </>
        )}

        {coach ? (
          <>
            <label>Overall summary (the member sees this)</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Main thing to work on next…" />
            <div className="row" style={{ marginTop: 10 }}>
              <button className="primary" disabled={busy} onClick={() => save("reviewed")}>
                Mark reviewed
              </button>
              <button disabled={busy} onClick={() => save("needs_revision")}>
                Needs revision
              </button>
              <button disabled={busy} onClick={() => save()}>
                Save draft
              </button>
              {sub.status !== "queued" && (
                <button disabled={busy} onClick={() => save("queued")}>
                  Back to queue
                </button>
              )}
            </div>
          </>
        ) : (
          sub.summary && (
            <>
              <h3 style={{ marginTop: 12 }}>Coach summary</h3>
              <p>{sub.summary}</p>
            </>
          )
        )}
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
