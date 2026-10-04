import "server-only";
import { NextResponse } from "next/server";
import { getDashboardViewer, getExperienceViewer, type Viewer } from "./whop";
import { ensureBusiness, ensureMember, type Business } from "./store";
import { resolvePlan } from "./plan";
import type { PlanName } from "./config";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}

/** Wrap a route handler so thrown HttpErrors become JSON responses. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
      console.error(err);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export interface Ctx {
  viewer: Viewer;
  business: Business;
  plan: PlanName;
}

export async function experienceCtx(experienceId: string | null | undefined): Promise<Ctx> {
  if (!experienceId) fail(400, "Missing experience.");
  const viewer = await getExperienceViewer(experienceId);
  if (!viewer) fail(401, "You need access to this community to do that.");
  const business = await ensureBusiness(viewer.businessId, viewer.businessName);
  await ensureMember(business.id, viewer.userId, viewer.name);
  const plan = await resolvePlan(business, viewer.role === "coach" ? viewer.userId : undefined);
  return { viewer, business, plan };
}

export async function dashboardCtx(businessId: string | null | undefined): Promise<Ctx> {
  if (!businessId) fail(400, "Missing business.");
  const viewer = await getDashboardViewer(businessId);
  if (!viewer) fail(403, "Only admins of this business can do that.");
  const business = await ensureBusiness(viewer.businessId, viewer.businessName);
  const plan = await resolvePlan(business, viewer.userId);
  return { viewer, business, plan };
}
