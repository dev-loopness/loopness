// Every value here comes from environment variables. See .env.example and CONNECT.md.

const env = (name: string) => (process.env[name] ?? "").trim();

export const config = {
  appId: env("WHOP_APP_ID"),
  apiKey: env("WHOP_API_KEY"),
  reviewloopBusinessId: env("REVIEWLOOP_BUSINESS_ID"),
  reviewloopBusinessApiKey: env("REVIEWLOOP_BUSINESS_API_KEY"),
  planIds: {
    pro: [env("WHOP_PRO_PLAN_ID"), env("WHOP_PRO_YEARLY_PLAN_ID")].filter(Boolean),
    team: [env("WHOP_TEAM_PLAN_ID"), env("WHOP_TEAM_YEARLY_PLAN_ID")].filter(Boolean),
  },
  // One-payment setup packages. Each one unlocks its plan for 12 months from the purchase date.
  packagePlanIds: {
    pro: [env("WHOP_LAUNCH_PACK_PLAN_ID")].filter(Boolean),
    team: [env("WHOP_SCALE_PACK_PLAN_ID")].filter(Boolean),
  },
  appUrl: env("APP_URL"),
  r2: {
    accountId: env("R2_ACCOUNT_ID"),
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    bucket: env("R2_BUCKET"),
  },
};

/** Demo mode runs without Whop: fake users, every feature viewable. On whenever the Whop keys are blank. */
export const isDemoMode = !config.apiKey || !config.appId;

export type PlanName = "free" | "pro" | "team";

export const PLANS: Record<
  PlanName,
  { label: string; price: string; coachSeats: number; monthlySubmissions: number; rubrics: boolean; liveMode: boolean; workload: boolean }
> = {
  free: { label: "Free", price: "$0", coachSeats: 1, monthlySubmissions: 30, rubrics: false, liveMode: false, workload: false },
  pro: { label: "Pro", price: "$39/mo", coachSeats: 3, monthlySubmissions: 1000, rubrics: true, liveMode: true, workload: false },
  team: { label: "Team", price: "$99/mo", coachSeats: Infinity, monthlySubmissions: 3000, rubrics: true, liveMode: true, workload: true },
};

/** How long a one-payment package keeps its plan unlocked. */
export const PACKAGE_TERM_DAYS = 365;

export const MAX_VIDEO_SECONDS = 180;
export const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;

export function checkoutUrl(plan: "pro" | "team"): string | null {
  const id = config.planIds[plan][0];
  return id ? `https://whop.com/checkout/${id}` : null;
}
