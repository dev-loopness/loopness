import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { DEMO_USERS } from "@/lib/whop";

/** Demo mode only: switch which fake user you are, or which plan the demo business has. */
export async function POST(req: Request) {
  if (!isDemoMode) return NextResponse.json({ error: "Demo mode is off." }, { status: 404 });
  const { user, plan } = (await req.json()) as { user?: string; plan?: string };
  const res = NextResponse.json({ ok: true });
  if (user && DEMO_USERS[user]) res.cookies.set("rl_demo_user", user, { path: "/", sameSite: "lax" });
  if (plan && ["free", "pro", "team"].includes(plan)) res.cookies.set("rl_demo_plan", plan, { path: "/", sameSite: "lax" });
  return res;
}
