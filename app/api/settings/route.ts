import { NextResponse } from "next/server";
import { dashboardCtx, handler } from "@/lib/api";
import { write, type BusinessSettings } from "@/lib/store";

const clean = (list: unknown, max: number, len: number) =>
  Array.isArray(list)
    ? list.map((x) => String(x).trim().slice(0, len)).filter(Boolean).slice(0, max)
    : [];

export const PUT = handler(async (req: Request) => {
  const body = (await req.json()) as { businessId?: string; settings?: Partial<BusinessSettings> };
  const { business } = await dashboardCtx(body.businessId);
  const s = body.settings ?? {};
  const next: BusinessSettings = {
    rubric: s.rubric ? clean(s.rubric, 8, 40) : business.settings.rubric,
    snippets: s.snippets ? clean(s.snippets, 30, 300) : business.settings.snippets,
    promiseHours: Math.min(24 * 30, Math.max(1, Number(s.promiseHours ?? business.settings.promiseHours) || 72)),
    openCapPerMember: Math.min(50, Math.max(0, Number(s.openCapPerMember ?? business.settings.openCapPerMember) || 0)),
    paused: typeof s.paused === "boolean" ? s.paused : business.settings.paused,
    missionDays: Math.min(60, Math.max(1, Number(s.missionDays ?? business.settings.missionDays) || 7)),
  };
  await write((db) => {
    db.businesses[business.id].settings = next;
  });
  return NextResponse.json({ settings: next });
});
