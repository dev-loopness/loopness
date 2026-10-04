"use client";

import { useState } from "react";
import type { Comment, Submission } from "@/lib/store";
import { STATUS_LABEL, timeAgo } from "@/lib/client";
import { SubmissionDetail, type ReviewTools } from "./SubmissionDetail";

type Tab = "queue" | "live" | "done";

export function CoachView({
  experienceId,
  queue,
  recent,
  comments,
  tools,
  liveEnabled,
  queueNotice,
}: {
  experienceId: string;
  queue: Submission[];
  recent: Submission[];
  comments: Comment[];
  tools: ReviewTools;
  liveEnabled: boolean;
  queueNotice: string | null;
}) {
  const [tab, setTab] = useState<Tab>("queue");
  const [selectedId, setSelectedId] = useState<string | null>(queue[0]?.id ?? null);
  const live = queue.filter((s) => s.forLiveSession);
  const list = tab === "queue" ? queue : tab === "live" ? live : recent;
  const selected = list.find((s) => s.id === selectedId) ?? (tab === "live" ? live[0] : null) ?? null;

  const commentsFor = (id: string) => comments.filter((c) => c.submissionId === id);
  const nextAfter = (id: string) => {
    const i = list.findIndex((s) => s.id === id);
    return list[i + 1]?.id ?? null;
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    const l = t === "queue" ? queue : t === "live" ? live : recent;
    setSelectedId(l[0]?.id ?? null);
  };

  return (
    <>
      <div className="tabs">
        <button aria-pressed={tab === "queue"} onClick={() => switchTab("queue")}>
          Review queue ({queue.length})
        </button>
        <button aria-pressed={tab === "live"} onClick={() => switchTab("live")} disabled={!liveEnabled} title={liveEnabled ? "" : "Live session mode comes with Pro"}>
          Live session ({live.length})
        </button>
        <button aria-pressed={tab === "done"} onClick={() => switchTab("done")}>
          Recently reviewed
        </button>
      </div>

      {queueNotice && <div className="notice warn">{queueNotice}</div>}
      {tab === "live" && (
        <div className="notice">
          Live session: work through videos members flagged for the call, one by one. Your notes save to each member as you go, and the
          next video opens when you mark one done.
        </div>
      )}

      {tab === "live" ? (
        selected ? (
          <div className="panel">
            <div className="row between" style={{ marginBottom: 10 }}>
              <span className="muted small">
                Video {live.findIndex((s) => s.id === selected.id) + 1} of {live.length}
              </span>
              <button onClick={() => setSelectedId(nextAfter(selected.id))} disabled={!nextAfter(selected.id)}>
                Skip to next
              </button>
            </div>
            <SubmissionDetail
              key={selected.id}
              submission={selected}
              comments={commentsFor(selected.id)}
              experienceId={experienceId}
              mode="coach"
              tools={tools}
              onDone={() => setSelectedId(nextAfter(selected.id))}
            />
          </div>
        ) : (
          <div className="panel muted">No videos are flagged for the live call. Members can tick &ldquo;for the next live call&rdquo; when they submit.</div>
        )
      ) : (
        <div className="review-grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 3fr)" }}>
          <div className="panel" style={{ padding: 8 }}>
            {list.length === 0 && <p className="muted small" style={{ padding: 8 }}>{tab === "queue" ? "The queue is empty. Nice work." : "Nothing reviewed yet."}</p>}
            <ul className="list">
              {list.map((s, i) => (
                <li key={s.id} className={`selectable${selected?.id === s.id ? " selected" : ""}`} onClick={() => setSelectedId(s.id)}>
                  <div className="row between">
                    <strong className="small">{tab === "queue" ? `${i + 1}. ` : ""}{s.title}</strong>
                  </div>
                  <div className="muted small">
                    {s.memberName} · {timeAgo(s.createdAt)}
                  </div>
                  <div className="row small" style={{ gap: 4, marginTop: 2 }}>
                    {tab !== "queue" && <span className={`badge ${s.status === "reviewed" ? "ok" : "warn"}`}>{STATUS_LABEL[s.status]}</span>}
                    {s.forLiveSession && <span className="badge">live call</span>}
                    {s.resubmissionOf && <span className="badge">resubmission</span>}
                    <span className="badge">{s.kind === "upload" ? "upload" : s.kind}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            {selected ? (
              <SubmissionDetail
                key={selected.id}
                submission={selected}
                comments={commentsFor(selected.id)}
                experienceId={experienceId}
                mode="coach"
                tools={tools}
                compact
                onDone={() => tab === "queue" && setSelectedId(nextAfter(selected.id))}
              />
            ) : (
              <p className="muted">Pick a video on the left to review it.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
