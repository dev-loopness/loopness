"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BusinessSettings } from "@/lib/store";
import { api } from "@/lib/client";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function SettingsForm({ businessId, settings, rubricsEnabled }: { businessId: string; settings: BusinessSettings; rubricsEnabled: boolean }) {
  const router = useRouter();
  const [rubric, setRubric] = useState(settings.rubric.join("\n"));
  const [snippets, setSnippets] = useState(settings.snippets.join("\n"));
  const [promiseHours, setPromiseHours] = useState(settings.promiseHours);
  const [cap, setCap] = useState(settings.openCapPerMember);
  const [missionDays, setMissionDays] = useState(settings.missionDays);
  const [paused, setPaused] = useState(settings.paused);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    setError(null);
    try {
      await api("/api/settings", {
        method: "PUT",
        json: { businessId, settings: { rubric: lines(rubric), snippets: lines(snippets), promiseHours, openCapPerMember: cap, missionDays, paused } },
      });
      setState("saved");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  };

  return (
    <form onSubmit={save}>
      <label className="inline">
        <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
        Pause new submissions
      </label>
      <label>Review promise shown to members (hours)</label>
      <input type="number" min={1} value={promiseHours} onChange={(e) => setPromiseHours(Number(e.target.value))} />
      <p className="muted small" style={{ marginTop: 4 }}>If the real wait gets longer than this, members see the real estimate instead.</p>
      <label>Max videos waiting per member (0 = no limit)</label>
      <input type="number" min={0} value={cap} onChange={(e) => setCap(Number(e.target.value))} />
      <label>First-video mission for new members (days)</label>
      <input type="number" min={1} value={missionDays} onChange={(e) => setMissionDays(Number(e.target.value))} />
      <label>Rubric, one score per line{rubricsEnabled ? "" : " (Pro plan)"}</label>
      <textarea value={rubric} onChange={(e) => setRubric(e.target.value)} disabled={!rubricsEnabled} />
      <label>Saved comments (snippets), one per line</label>
      <textarea value={snippets} onChange={(e) => setSnippets(e.target.value)} style={{ minHeight: 110 }} />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="primary" disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : "Save settings"}
        </button>
        {state === "saved" && <span className="muted small">Saved</span>}
      </div>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
