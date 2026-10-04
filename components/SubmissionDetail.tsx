"use client";

// One submission: the video with its comment timeline, the feedback thread and, for coaches,
// the composer, rubric and review actions.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowCounterClockwise, ChatCircle, CheckCircle, Trash, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { Comment, Submission, SubmissionStatus } from "@/lib/store";
import { formatTime } from "@/lib/reviews";
import { api } from "@/lib/client";
import { VideoPlayer, type PlayerHandle } from "./VideoPlayer";
import { StatusPill } from "./StatusPill";
import { Time } from "./Time";

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

/** Marks every timestamped comment along the video's length; click a mark to jump there. */
function Timeline({ player, comments }: { player: React.RefObject<PlayerHandle | null>; comments: Comment[] }) {
  const [state, setState] = useState<{ t: number; d: number | null }>({ t: 0, d: null });
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = player.current?.getTime() ?? 0;
      const d = player.current?.getDuration() ?? null;
      setState((s) => (s.t === t && s.d === d ? s : { t, d }));
    }, 250);
    return () => window.clearInterval(id);
  }, [player]);
  const d = state.d;
  if (!d) return null;
  const marks = comments.filter((c) => c.t !== null && c.t <= d);
  return (
    <div className="timeline" role="group" aria-label="Comments along the video">
      <span className="playhead" style={{ left: `${(state.t / d) * 100}%` }} aria-hidden="true" />
      {marks.map((c) => (
        <button
          key={c.id}
          className="mark"
          style={{ left: `${(c.t! / d) * 100}%` }}
          onClick={() => player.current?.seek(c.t!)}
          aria-label={`Jump to ${formatTime(c.t!)}: ${c.text}`}
          title={`${formatTime(c.t!)}  ${c.text}`}
        />
      ))}
    </div>
  );
}

/** Live readout of where a new comment will be pinned. */
function useCurrentTime(player: React.RefObject<PlayerHandle | null>) {
  const [t, setT] = useState<number | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => setT(player.current?.getTime() ?? null), 250);
    return () => window.clearInterval(id);
  }, [player]);
  return t;
}

export function SubmissionDetail({
  submission: sub,
  comments,
  experienceId,
  mode,
  tools,
  onDone,
  doneLabel = "Mark Reviewed",
}: {
  submission: Submission;
  comments: Comment[];
  experienceId: string;
  mode: "coach" | "member";
  tools?: ReviewTools;
  /** Called after a coach marks the submission reviewed or needs revision. */
  onDone?: () => void;
  doneLabel?: string;
}) {
  const router = useRouter();
  const player = useRef<PlayerHandle | null>(null);
  const coach = mode === "coach";
  const now = useCurrentTime(player);
  const [text, setText] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [scores, setScores] = useState<Record<string, number>>(sub.scores);
  const [summary, setSummary] = useState(sub.summary);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sorted = [...comments].sort((a, b) => (a.t ?? Infinity) - (b.t ?? Infinity) || a.createdAt.localeCompare(b.createdAt));
  const typed = timeInput ? parseTime(timeInput) : null;
  const pinAt = coach ? (typed ?? now) : null;

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      router.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const addComment = (body: string, when: "now" | "general") =>
    run("comment", async () => {
      const t = coach && when === "now" ? pinAt : null;
      await api(`/api/submissions/${sub.id}/comments`, { method: "POST", json: { experienceId, t, text: body } });
      setText("");
      setTimeInput("");
    });

  const save = (status?: SubmissionStatus) =>
    run(status ?? "draft", async () => {
      await api(`/api/submissions/${sub.id}`, { method: "PATCH", json: { experienceId, status, scores, summary } });
    }).then((ok) => ok && status && status !== "queued" && onDone?.());

  const remove = (id: string) =>
    run("delete", () => api(`/api/comments/${id}?experienceId=${encodeURIComponent(experienceId)}`, { method: "DELETE" })).then(() =>
      setConfirmDelete(null),
    );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) {
      e.preventDefault();
      void addComment(text, coach ? "now" : "general");
    }
  };

  return (
    <div className="review">
      <section aria-label="Video">
        <VideoPlayer kind={sub.kind} url={sub.url} experienceId={experienceId} handle={player} />
        <Timeline player={player} comments={comments} />
        <div className="sub-head">
          <div style={{ minWidth: 0 }}>
            <h2 className="truncate">{sub.title}</h2>
            <p className="small muted">
              {sub.memberName}, sent <Time iso={sub.createdAt} />
              {sub.durationSec ? <span className="num">, {formatTime(sub.durationSec)} long</span> : null}
            </p>
          </div>
          <div className="row" style={{ flex: "none" }}>
            {sub.resubmissionOf && <span className="pill">New version</span>}
            {sub.forLiveSession && <span className="pill accent">Live call</span>}
            <StatusPill status={sub.status} />
          </div>
        </div>
        {sub.note && <p className="note">{sub.note}</p>}
      </section>

      <aside aria-label="Feedback">
        {coach && tools?.seatBlocker && (
          <div className="banner warn" role="status">
            <WarningCircle size={16} weight="bold" aria-hidden="true" />
            <p>{tools.seatBlocker}</p>
          </div>
        )}

        <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
          <h3>Feedback</h3>
          <span className="xs faint num">{comments.length} comments</span>
        </div>
        {sorted.length === 0 ? (
          <p className="small muted" style={{ padding: "8px 0 12px" }}>
            {coach ? "Pause on a moment and write what you see. Each note is pinned to that time." : "Your coach hasn't left feedback yet."}
          </p>
        ) : (
          <div className="thread">
            {sorted.map((c) => {
              const fromMember = c.authorId === sub.memberId;
              return (
                <div className={`comment${fromMember ? " member" : ""}`} key={c.id}>
                  {c.t !== null ? (
                    <button className="t" onClick={() => player.current?.seek(c.t!)} aria-label={`Jump to ${formatTime(c.t)}`}>
                      {formatTime(c.t)}
                    </button>
                  ) : (
                    <span className="t none">{fromMember ? "Reply" : "Note"}</span>
                  )}
                  <p className="body">{c.text}</p>
                  <div className="by">
                    <span>
                      {c.authorName}, <Time iso={c.createdAt} />
                    </span>
                    {coach && !fromMember &&
                      (confirmDelete === c.id ? (
                        <>
                          <button className="btn-ghost" style={{ color: "var(--danger)" }} onClick={() => remove(c.id)} disabled={busy === "delete"}>
                            Delete
                          </button>
                          <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>
                            Keep
                          </button>
                        </>
                      ) : (
                        <button className="btn-ghost btn-icon" style={{ width: 22 }} onClick={() => setConfirmDelete(c.id)} aria-label="Delete comment">
                          <Trash size={13} aria-hidden="true" />
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="composer" style={{ marginTop: 10 }}>
          <label htmlFor={`c-${sub.id}`} className="sr-only">
            {coach ? "New comment" : "Reply to your coach"}
          </label>
          <textarea
            id={`c-${sub.id}`}
            name="comment"
            autoComplete="off"
            placeholder={coach ? "What should they fix at this moment…" : "Ask your coach a question…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
          />
          <div className="bar">
            {coach ? (
              <>
                <span className="at">
                  Pin at{" "}
                  <input
                    type="text"
                    name="timestamp"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label="Timestamp, for example 1:05"
                    placeholder={pinAt !== null ? formatTime(pinAt) : "0:00"}
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                  />
                </span>
                <span className="spacer" />
                <button
                  className="btn-ghost btn-icon"
                  disabled={!!busy || !text.trim()}
                  onClick={() => addComment(text, "general")}
                  aria-label="Add as a general note, without a timestamp"
                  title="Add as a general note, without a timestamp"
                >
                  <ChatCircle size={16} aria-hidden="true" />
                </button>
                <button className="btn-primary" disabled={!!busy || !text.trim()} onClick={() => addComment(text, "now")}>
                  {busy === "comment" ? "Adding…" : "Add Comment"}
                </button>
              </>
            ) : (
              <>
                <span className="spacer" />
                <button className="btn-primary" disabled={!!busy || !text.trim()} onClick={() => addComment(text, "general")}>
                  {busy === "comment" ? "Sending…" : "Send Reply"}
                </button>
              </>
            )}
          </div>
        </div>
        {coach && tools && tools.snippets.length > 0 && (
          <div className="snippets" aria-label="Saved comments">
            {tools.snippets.map((s) => (
              <button key={s} onClick={() => addComment(s, "now")} disabled={!!busy} title={`Add at current time: ${s}`}>
                <span>{s}</span>
              </button>
            ))}
          </div>
        )}

        {coach && (
          <>
            <hr className="divider" />
            {tools?.rubricsEnabled && tools.rubric.length > 0 ? (
              <div className="rubric" role="group" aria-label="Scores">
                {tools.rubric.map((r) => (
                  <div key={r} style={{ display: "contents" }}>
                    <span className="small">{r}</span>
                    <span className="scale" role="group" aria-label={r}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} aria-pressed={scores[r] === n} onClick={() => setScores({ ...scores, [r]: n })} aria-label={`${r} ${n} of 5`}>
                          {n}
                        </button>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="xs muted">Rubric scores come with the Pro plan.</p>
            )}
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor={`s-${sub.id}`}>Summary for {sub.memberName}</label>
              <textarea
                id={`s-${sub.id}`}
                name="summary"
                autoComplete="off"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="The one thing to work on next…"
              />
            </div>
            <div className="actions">
              <button className="btn-primary" disabled={!!busy} onClick={() => save("reviewed")}>
                <CheckCircle size={16} weight="bold" aria-hidden="true" />
                {busy === "reviewed" ? "Saving…" : doneLabel}
              </button>
              <button disabled={!!busy} onClick={() => save("needs_revision")}>
                <ArrowCounterClockwise size={16} aria-hidden="true" />
                Ask for Revision
              </button>
              <button className="btn-ghost" disabled={!!busy} onClick={() => save()}>
                {busy === "draft" ? "Saving…" : "Save Draft"}
              </button>
              {sub.status !== "queued" && (
                <button className="btn-ghost" disabled={!!busy} onClick={() => save("queued")}>
                  Back to Queue
                </button>
              )}
            </div>
          </>
        )}

        {!coach && (Object.keys(sub.scores).length > 0 || sub.summary) && (
          <>
            <hr className="divider" />
            {sub.summary && (
              <div className="field">
                <span className="label">Coach summary</span>
                <p>{sub.summary}</p>
              </div>
            )}
            {Object.keys(sub.scores).length > 0 && (
              <div className="rubric" style={{ marginTop: 14 }}>
                {Object.entries(sub.scores).map(([k, v]) => (
                  <div key={k} style={{ display: "contents" }}>
                    <span className="small">{k}</span>
                    <span className="score-read">
                      {v}
                      <span className="muted small"> / 5</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div aria-live="polite">
          {error && (
            <p className="error" style={{ marginTop: 10 }}>
              <WarningCircle size={14} weight="bold" aria-hidden="true" />
              {error}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
