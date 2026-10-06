import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { DEMO_BUSINESS, DEMO_EXPERIENCE_ID, DEMO_USERS } from "@/lib/whop";

/** Demo mode only: open the demo as a given user, e.g. /api/demo?user=user_demo_alex&to=community */
export async function GET(req: Request) {
  if (!isDemoMode) return NextResponse.json({ error: "Demo mode is off." }, { status: 404 });
  const url = new URL(req.url);
  const user = url.searchParams.get("user") ?? "";
  const dest = url.searchParams.get("to") === "dashboard" ? `/dashboard/${DEMO_BUSINESS.id}` : `/experiences/${DEMO_EXPERIENCE_ID}`;
  // A relative Location keeps the redirect right behind a host's proxy.
  const res = new NextResponse(null, { status: 303, headers: { Location: dest } });
  if (DEMO_USERS[user]) res.cookies.set("rl_demo_user", user, { path: "/", sameSite: "lax" });
  return res;
}

/** Demo mode only: switch which fake user you are, or which plan the demo business has. */
export async function POST(req: Request) {
  if (!isDemoMode) return NextResponse.json({ error: "Demo mode is off." }, { status: 404 });
  const { user, plan } = (await req.json()) as { user?: string; plan?: string };
  const res = NextResponse.json({ ok: true });
  if (user && DEMO_USERS[user]) res.cookies.set("rl_demo_user", user, { path: "/", sameSite: "lax" });
  if (plan && ["free", "pro", "team"].includes(plan)) res.cookies.set("rl_demo_plan", plan, { path: "/", sameSite: "lax" });
  return res;
}
