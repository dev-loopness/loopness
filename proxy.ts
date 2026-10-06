// Public demo only: give each new visitor a random sandbox id, so they get their own sample
// community (see lib/sandbox.ts). The id is also added to this first request, so the page
// that sets it can already use it.

import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "rl_sandbox";
const VALID = /^[a-f0-9]{16}$/;

export function proxy(req: NextRequest) {
  const publicDemo = process.env.PUBLIC_DEMO?.trim() === "1" && !(process.env.WHOP_APP_ID?.trim() && process.env.WHOP_API_KEY?.trim());
  if (!publicDemo || VALID.test(req.cookies.get(COOKIE)?.value ?? "")) return NextResponse.next();

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  req.cookies.set(COOKIE, id);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set(COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", maxAge: 60 * 60 * 24 * 7 });
  return res;
}

export const config = {
  // Pages and API calls only, not static files.
  matcher: ["/((?!_next/|demo/|favicon.ico).*)"],
};
