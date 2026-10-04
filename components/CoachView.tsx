"use client";

import { useEffect, useState } from "react";
import { Broadcast, CheckCircle, FilmStrip, SkipForward, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { Comment, Submission } from "@/lib/store";
import { SubmissionDetail, type ReviewTools } from "./SubmissionDetail";
import { StatusPill } from "./StatusPill";
import { Time } from "./Time";

type View = "queue" | "live" | "done";

export function CoachView({
  experienceId,
  queue,
  recent,
  comments,
  tools,
  liveEnabled,
  queueNotice,
  initialView,
  initialId,
}: {
  experienceId: string;
  queue: Submission[];
  recent: Submission[];
  comments: Comment[];
  tools: ReviewTools;
  liveEnabled: boolean;
  queueNotice: string | null;
  initialView: View;
  initialId: string | null;
}) {
  const live = queue.filter((s) => s.forLiveSession);
  const listFor = (v: View) => (v === "queue" ? queue : v === "live" ? live : recent);
  const [view, setView] = useState<View>(initialView === "live" && !liveEnabled ? "queue" : initialView);
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? listFor(initialView)[0]?.id ?? null);

  const list = listFor(view);
  const selected = list.find((s) => s.id === selectedId) ?? list[0] ?? null;
  const commentsFor = (id: string) => comments.filter((c) => c.submissionId === id);
  const nextAfter = (id: string) => {
    const i = list.findIndex((s) => s.id === id);
    return list[i + 1]?.id ?? list[i - 1]?.id ?? null;
  };

  // Keep the open view and video in the URL so a refresh or shared link lands in the same place.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    if (selected) url.searchParams.set("s", selected.id);
    else url.searchParams.delete("s");
    window.history.replaceState(null, "", url);
  }, [view, selected]);

  // Live session: "N" skips to the next flagged video when not typing.
  useEffect(() => {
    if (view !== "live" || !selected) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || el.closest("input, textarea, select")) return;
      const next = nextAfter(selected.id);
      if (next) setSelectedId(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const switchView = (v: View) => {
    setView(v);
    setSelectedId(listFor(v)[0]?.id ?? null);
  };

  const tabs = (
    <div className="segmented" role="group" aria-label="View">
      <button aria-pressed={view === "queue"} onClick={() => switchView("queue")}>
        Queue <span className="num faint">{queue.length}</span>
      </button>
      <button aria-pressed={view === "live"} onClick={() => switchView("live")} disabled={!liveEnabled} title={liveEnabled ? undefined : "Live sessions come with the Pro plan"}>
        <Broadcast size={14} aria-hidden="true" />
        Live Session <span className="num faint">{live.length}</span>
      </button>
      <button aria-pressed={view === "done"} onClick={() => switchView("done")}>
        Reviewed
      </button>
    </div>
  );

  return (
    <>
      <div style={{ marginBottom: 16 }}>{tabs}</div>
      {queueNotice && (
        <div className="banner warn" role="status">
          <WarningCircle size={16} weight="bold" aria-hidden="true" />
          <p>{queueNotice}</p>
        </div>
      )}

      {view === "live" ? (
        <div className="stage">
          {selected ? (
            <>
              <div className="stage-head">
                <span className="small muted num">
                  {live.findIndex((s) => s.id === selected.id) + 1} of {live.length} for this call
                </span>
                <nav className="up-next" aria-label="Videos for this call">
                  {live.map((s) => (
                    <button key={s.id} aria-current={s.id === selected.id} onClick={() => setSelectedId(s.id)}>
                      {s.memberName}
                    </button>
                  ))}
                </nav>
                <span className="spacer" />
                <button className="btn-ghost" style={{ color: "var(--stage-muted)" }} onClick={() => setSelectedId(nextAfter(selected.id))} disabled={live.length < 2}>
                  <SkipForward size={14} aria-hidden="true" />
                  Skip <kbd>N</kbd>
                </button>
              </div>
              <SubmissionDetail
                key={selected.id}
                submission={selected}
                comments={commentsFor(selected.id)}
                experienceId={experienceId}
                mode="coach"
                tools={tools}
                doneLabel="Done, Next Video"
                onDone={() => setSelectedId(nextAfter(selected.id))}
              />
            </>
          ) : (
            <div className="empty" style={{ color: "var(--stage-muted)" }}>
              <Broadcast size={28} aria-hidden="true" />
              <p>No videos are flagged for the next call.</p>
              <p className="xs">Members tick &ldquo;Review this on the next live call&rdquo; when they send a video.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="workspace">
          <nav className="surface rail" aria-label={view === "queue" ? "Review queue" : "Reviewed videos"}>
            <div className="rail-head">
              <h2 style={{ fontSize: 14 }}>{view === "queue" ? "Waiting for review" : "Recently reviewed"}</h2>
              <span className="xs faint num">{list.length}</span>
            </div>
            {list.length === 0 ? (
              <div className="empty">
                {view === "queue" ? <CheckCircle size={28} aria-hidden="true" /> : <FilmStrip size={28} aria-hidden="true" />}
                <p>{view === "queue" ? "Queue is clear. New videos appear here as members send them." : "Videos you review will collect here."}</p>
              </div>
            ) : (
              <ul className="queue">
                {list.map((s, i) => (
                  <li key={s.id}>
                    <button className="item" aria-current={selected?.id === s.id} onClick={() => setSelectedId(s.id)}>
                      <span className="pos">{view === "queue" ? i + 1 : ""}</span>
                      <span className="title truncate">{s.title}</span>
                      <span className="meta">
                        <span className="truncate">{s.memberName}</span>
                        <span className="faint">
                          <Time iso={s.createdAt} />
                        </span>
                        {view === "done" && <StatusPill status={s.status} />}
                        {view === "queue" && s.forLiveSession && <span className="pill accent">Live</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
          <div>
            {selected ? (
              <SubmissionDetail
                key={selected.id}
                submission={selected}
                comments={commentsFor(selected.id)}
                experienceId={experienceId}
                mode="coach"
                tools={tools}
                onDone={() => view === "queue" && setSelectedId(nextAfter(selected.id))}
              />
            ) : (
              <div className="surface empty" style={{ padding: 48 }}>
                <FilmStrip size={32} aria-hidden="true" />
                <p>Pick a video from the list to start reviewing.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
