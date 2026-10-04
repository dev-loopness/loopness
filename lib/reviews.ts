// Queue maths and plan limits shared by pages and API routes.

import { PLANS, type PlanName } from "./config";
import type { Business, Submission } from "./store";

export function startOfMonth(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export function monthSubmissions(subs: Submission[], businessId: string) {
  const from = startOfMonth();
  return subs.filter((s) => s.businessId === businessId && s.createdAt >= from);
}

export function queueFor(subs: Submission[], businessId: string) {
  return subs
    .filter((s) => s.businessId === businessId && s.status === "queued")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Coaches who reviewed something this month. Used for seat limits. */
export function activeCoaches(subs: Submission[], businessId: string) {
  const from = startOfMonth();
  const ids = new Set<string>();
  for (const s of subs) if (s.businessId === businessId && s.reviewerId && s.reviewedAt && s.reviewedAt >= from) ids.add(s.reviewerId);
  return ids;
}

/**
 * Honest wait estimate in hours for someone at `position` in the queue (1 = next).
 * Based on how many reviews the business finished in the last 7 days.
 */
export function estimateWaitHours(subs: Submission[], businessId: string, position: number): number | null {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const done = subs.filter((s) => s.businessId === businessId && s.reviewedAt && s.reviewedAt >= weekAgo).length;
  if (done === 0) return null;
  const perHour = done / (7 * 24);
  return Math.max(1, Math.round(position / perHour));
}

export function averageReviewHours(subs: Submission[], businessId: string): number | null {
  const reviewed = subs.filter((s) => s.businessId === businessId && s.reviewedAt).slice(-50);
  if (!reviewed.length) return null;
  const total = reviewed.reduce((n, s) => n + (Date.parse(s.reviewedAt!) - Date.parse(s.createdAt)), 0);
  return Math.round((total / reviewed.length / 3_600_000) * 10) / 10;
}

/** Why a member can't submit right now, or null if they can. */
export function submissionBlocker(subs: Submission[], business: Business, plan: PlanName, memberId: string): string | null {
  if (business.settings.paused) return "New submissions are paused by your coach right now.";
  if (monthSubmissions(subs, business.id).length >= PLANS[plan].monthlySubmissions)
    return "This community has reached its submission limit for the month. Your coach has been told.";
  const cap = business.settings.openCapPerMember;
  if (cap > 0) {
    const open = subs.filter((s) => s.businessId === business.id && s.memberId === memberId && s.status === "queued").length;
    if (open >= cap) return `You already have ${open} videos waiting for review. You can send more once one is reviewed.`;
  }
  return null;
}

/** Why a coach can't review right now (seat limit), or null. */
export function coachBlocker(subs: Submission[], businessId: string, plan: PlanName, coachId: string): string | null {
  const coaches = activeCoaches(subs, businessId);
  if (coaches.has(coachId)) return null;
  const seats = PLANS[plan].coachSeats;
  if (coaches.size >= seats)
    return `Your ${PLANS[plan].label} plan includes ${seats} reviewing coach${seats === 1 ? "" : "es"} a month, and they're all in use. Upgrade to add more coaches.`;
  return null;
}

export function detectKind(url: string): "youtube" | "tiktok" | "link" {
  try {
    const host = new URL(url).hostname.replace(/^www\.|^m\./, "");
    if (host === "youtube.com" || host === "youtu.be") return "youtube";
    if (host.endsWith("tiktok.com")) return "tiktok";
  } catch {}
  return "link";
}

export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("youtu.be")) return u.pathname.slice(1) || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/(shorts|embed|live)\/([\w-]+)/);
    return m?.[2] ?? null;
  } catch {
    return null;
  }
}

export function tiktokId(url: string): string | null {
  return url.match(/\/video\/(\d+)/)?.[1] ?? null;
}

export function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
