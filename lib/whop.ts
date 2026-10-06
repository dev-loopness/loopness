// Who is looking at the app, and what can they do?
// Inside Whop, every request carries a signed "x-whop-user-token" header. We verify it,
// then ask Whop whether that user is an admin (coach) or a customer (member).
// With the Whop keys blank, demo mode fakes the users instead.

import "server-only";
import { cookies, headers } from "next/headers";
import { WhopClient } from "@whop/sdk";
import { verifyUserToken } from "@whop/api";
import { config, isDemoMode, isPublicDemo } from "./config";
import { currentSandbox, ensureSandbox, sandboxBusinessId, SANDBOX_NAME } from "./sandbox";

export type Role = "coach" | "member";

export interface Viewer {
  userId: string;
  name: string;
  role: Role;
  businessId: string;
  businessName: string;
  experienceId: string | null;
}

export const DEMO_BUSINESS = { id: "biz_demo", name: "Northside Lifting Club" };
export const DEMO_EXPERIENCE_ID = "exp_demo";
export const DEMO_USERS: Record<string, { name: string; role: Role }> = {
  user_demo_coach: { name: "Marisol Ortega", role: "coach" },
  user_demo_coach2: { name: "Dev Kapoor", role: "coach" },
  user_demo_alex: { name: "Tobiah Wren", role: "member" },
  user_demo_jo: { name: "Ines Achterberg", role: "member" },
};

const API_VERSION = "2026-09-29";

let appClient: WhopClient | null = null;
export function whopApp(): WhopClient {
  appClient ??= new WhopClient({ token: config.apiKey, apiVersionDate: API_VERSION });
  return appClient;
}

let bizClient: WhopClient | null = null;
/** Client for Raihan's own ReviewLoop business, used to check who bought Pro or Team. */
export function whopReviewLoopBusiness(): WhopClient {
  bizClient ??= new WhopClient({
    token: config.reviewloopBusinessApiKey || config.apiKey,
    apiVersionDate: API_VERSION,
  });
  return bizClient;
}

// Small in-memory cache so we don't call Whop on every click.
const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function demoViewer(experienceId: string | null): Promise<Viewer> {
  const jar = await cookies();
  const id = jar.get("rl_demo_user")?.value;
  const userId = id && DEMO_USERS[id] ? id : "user_demo_coach";
  if (isPublicDemo) {
    // Every visitor gets their own sample community, whatever ids are in the URL.
    const sid = await currentSandbox();
    await ensureSandbox(sid, experienceId ?? DEMO_EXPERIENCE_ID);
    return { userId, ...DEMO_USERS[userId], businessId: sandboxBusinessId(sid), businessName: SANDBOX_NAME, experienceId };
  }
  return {
    userId,
    ...DEMO_USERS[userId],
    businessId: DEMO_BUSINESS.id,
    businessName: DEMO_BUSINESS.name,
    experienceId,
  };
}

async function whopUserId(): Promise<string | null> {
  const payload = await verifyUserToken(await headers(), { appId: config.appId, dontThrow: true });
  return payload?.userId ?? null;
}

async function userName(userId: string): Promise<string> {
  return cached(`user:${userId}`, 10 * 60_000, async () => {
    const u = await whopApp().users.retrieve({ id: userId });
    return u.name || u.username;
  });
}

/** Viewer inside a Whop experience (the member-facing view). Null = not signed in or no access. */
export async function getExperienceViewer(experienceId: string): Promise<Viewer | null> {
  if (isDemoMode) return demoViewer(experienceId);
  const userId = await whopUserId();
  if (!userId) return null;
  const [experience, access] = await Promise.all([
    cached(`exp:${experienceId}`, 10 * 60_000, () => whopApp().experiences.retrieve({ id: experienceId })),
    cached(`access:${userId}:${experienceId}`, 60_000, () =>
      whopApp().users.checkAccess({ id: userId, resource_id: experienceId }),
    ),
  ]);
  if (!access.has_access) return null;
  return {
    userId,
    name: await userName(userId),
    role: access.access_level === "admin" ? "coach" : "member",
    businessId: experience.company.id,
    businessName: experience.company.title,
    experienceId,
  };
}

/** Viewer on the business dashboard view. Only admins of that business get through. */
export async function getDashboardViewer(businessId: string): Promise<Viewer | null> {
  if (isDemoMode) {
    const v = await demoViewer(null);
    return v.role === "coach" ? v : null;
  }
  const userId = await whopUserId();
  if (!userId) return null;
  const access = await cached(`access:${userId}:${businessId}`, 60_000, () =>
    whopApp().users.checkAccess({ id: userId, resource_id: businessId }),
  );
  if (access.access_level !== "admin") return null;
  const account = await cached(`biz:${businessId}`, 10 * 60_000, () =>
    whopApp().accounts.retrieve({ id: businessId }).catch(() => null),
  );
  return {
    userId,
    name: await userName(userId),
    role: "coach",
    businessId,
    businessName: account?.title ?? "Your business",
    experienceId: null,
  };
}
