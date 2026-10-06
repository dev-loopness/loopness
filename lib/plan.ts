// Which ReviewLoop plan does a business have?
// Plans are sold as Raihan's own Whop product. A business is on Pro or Team when one of its
// admins holds an active membership on the matching plan in the ReviewLoop business, or bought
// the matching setup package (Launch Pack = Pro, Scale Pack = Team) within the last 12 months.

import "server-only";
import { cookies } from "next/headers";
import { config, isDemoMode, PACKAGE_TERM_DAYS, type PlanName } from "./config";
import { read, write, type Business } from "./store";
import { whopReviewLoopBusiness } from "./whop";

const RECHECK_MS = 15 * 60_000;
const PAYING = new Set(["active", "trialing", "canceling", "past_due"]);
// A one-payment purchase can show as "completed" once paid, so packages also count that status.
const PACKAGE_PAID = new Set([...PAYING, "completed"]);
const PACKAGE_TERM_MS = PACKAGE_TERM_DAYS * 24 * 60 * 60_000;

function tierFor(m: { plan_id: string; status: string; created_at: string }): PlanName {
  if (PAYING.has(m.status)) {
    if (config.planIds.team.includes(m.plan_id)) return "team";
    if (config.planIds.pro.includes(m.plan_id)) return "pro";
  }
  const withinTerm = Date.now() - Date.parse(m.created_at) < PACKAGE_TERM_MS;
  if (PACKAGE_PAID.has(m.status) && withinTerm) {
    if (config.packagePlanIds.team.includes(m.plan_id)) return "team";
    if (config.packagePlanIds.pro.includes(m.plan_id)) return "pro";
  }
  return "free";
}

async function planForUser(userId: string): Promise<PlanName> {
  if (!config.reviewloopBusinessId) return "free";
  let best: PlanName = "free";
  try {
    const page = await whopReviewLoopBusiness().memberships.list({
      account_id: config.reviewloopBusinessId,
      user_id: userId,
    });
    for await (const m of page) {
      const tier = tierFor(m);
      if (tier === "team") return "team";
      if (tier === "pro") best = "pro";
    }
  } catch (err) {
    console.error("[plan] could not check memberships", err);
  }
  return best;
}

/** Current plan for a business. Pass the viewing admin so a new buyer is picked up straight away. */
export async function resolvePlan(business: Business, adminUserId?: string): Promise<PlanName> {
  if (isDemoMode) {
    const p = (await cookies()).get("rl_demo_plan")?.value;
    return p === "free" || p === "pro" || p === "team" ? p : "pro";
  }
  const age = business.planCheckedAt ? Date.now() - Date.parse(business.planCheckedAt) : Infinity;
  // Paid plans are rechecked every 15 minutes. Free businesses are rechecked at most once a minute
  // while an admin is looking, so a fresh purchase shows up almost immediately.
  if (age < RECHECK_MS && (business.plan !== "free" || !adminUserId || age < 60_000)) return business.plan;

  let plan: PlanName = "free";
  let billingUserId = business.billingUserId;
  if (billingUserId) plan = await planForUser(billingUserId);
  if (plan === "free" && adminUserId && adminUserId !== billingUserId) {
    plan = await planForUser(adminUserId);
    if (plan !== "free") billingUserId = adminUserId;
  }
  await write((db) => {
    const b = db.businesses[business.id];
    b.plan = plan;
    b.billingUserId = billingUserId;
    b.planCheckedAt = new Date().toISOString();
  });
  return plan;
}

export async function getBusiness(id: string) {
  return read((db) => db.businesses[id]);
}
