"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { BusinessSettings } from "@/lib/store";
import { api } from "@/lib/client";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function SettingsForm({ businessId, settings, rubricsEnabled }: { businessId: string; settings: BusinessSettings; rubricsEnabled: boolean }) {
  const router = useRouter();
  const [rubric, setRubric] = useState(settings.rubric.join("\n"));
  const [snippets, setSnippets] = useState(settings.snippets.join("\n"));
  const [promiseHours, setPromiseHours] = useState(String(settings.promiseHours));
  const [cap, setCap] = useState(String(settings.openCapPerMember));
  const [missionDays, setMissionDays] = useState(String(settings.missionDays));
  const [paused, setPaused] = useState(settings.paused);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const touch = () => state === "saved" && setState("idle");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    setError(null);
    try {
      await api("/api/settings", {
        method: "PUT",
        json: {
          businessId,
          settings: {
            rubric: lines(rubric),
            snippets: lines(snippets),
            promiseHours: Number(promiseHours),
            openCapPerMember: Number(cap),
            missionDays: Number(missionDays),
            paused,
          },
        },
      });
      setState("saved");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  };

  return (
    <form onSubmit={save} onChange={touch}>
      <label className="check" style={{ paddingTop: 0 }}>
        <input type="checkbox" name="paused" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
        <span>
          Pause new videos
          <span className="hint" style={{ display: "block" }}>
            Members see that reviews are paused. Videos already waiting stay in the queue.
          </span>
        </span>
      </label>
      <hr className="divider" style={{ marginTop: 6 }} />
      <div className="field">
        <label htmlFor="promise">Review promise (hours)</label>
        <input id="promise" name="promiseHours" type="number" inputMode="numeric" min={1} autoComplete="off" value={promiseHours} onChange={(e) => setPromiseHours(e.target.value)} />
        <span className="hint">When reviews run slower than this, members see the real wait instead.</span>
      </div>
      <div className="field">
        <label htmlFor="cap">Videos waiting per member</label>
        <input id="cap" name="openCapPerMember" type="number" inputMode="numeric" min={0} autoComplete="off" value={cap} onChange={(e) => setCap(e.target.value)} />
        <span className="hint">0 means no limit.</span>
      </div>
      <div className="field">
        <label htmlFor="mission">First-video nudge for new members (days)</label>
        <input id="mission" name="missionDays" type="number" inputMode="numeric" min={1} autoComplete="off" value={missionDays} onChange={(e) => setMissionDays(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="rubric">Rubric</label>
        <textarea id="rubric" name="rubric" autoComplete="off" value={rubric} onChange={(e) => setRubric(e.target.value)} disabled={!rubricsEnabled} />
        <span className="hint">{rubricsEnabled ? "One score per line. Coaches rate each from 1 to 5." : "Rubric scores come with the Pro plan."}</span>
      </div>
      <div className="field">
        <label htmlFor="snippets">Saved comments</label>
        <textarea id="snippets" name="snippets" autoComplete="off" value={snippets} onChange={(e) => setSnippets(e.target.value)} style={{ minHeight: 112 }} />
        <span className="hint">One per line. Coaches add these in one click while reviewing.</span>
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn-primary" disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : "Save Settings"}
        </button>
        <span aria-live="polite" className="small muted row" style={{ gap: 4 }}>
          {state === "saved" && (
            <>
              <CheckCircle size={14} weight="bold" aria-hidden="true" style={{ color: "var(--ok)" }} />
              Saved
            </>
          )}
        </span>
      </div>
      {error && (
        <p className="error" style={{ marginTop: 10 }} role="alert">
          <WarningCircle size={14} weight="bold" aria-hidden="true" />
          {error}
        </p>
      )}
    </form>
  );
}
