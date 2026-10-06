import { cookies } from "next/headers";
import { config, isPublicDemo } from "@/lib/config";
import { DEMO_BUSINESS, DEMO_EXPERIENCE_ID, DEMO_USERS } from "@/lib/whop";
import { DemoSwitcher } from "./DemoSwitcher";

export async function DemoBar() {
  const jar = await cookies();
  const user = jar.get("rl_demo_user")?.value ?? "user_demo_coach";
  const plan = jar.get("rl_demo_plan")?.value ?? "pro";
  return (
    <div className="demobar" role="region" aria-label="Demo controls">
      {isPublicDemo ? (
        <>
          <strong>Live demo</strong>
          <span>Sample community. Your changes are private to you.</span>
        </>
      ) : (
        <>
          <strong>Demo mode</strong>
          <span>Whop isn&apos;t connected, so these are test users.</span>
        </>
      )}
      <DemoSwitcher users={Object.entries(DEMO_USERS).map(([id, u]) => ({ id, name: `${u.name} (${u.role})` }))} user={user} plan={plan} />
      <span className="spacer" />
      <a href={`/experiences/${DEMO_EXPERIENCE_ID}`}>Community View</a>
      {/* Only coaches (admins) can open the dashboard, so a member switches to a coach on the way. */}
      <a href={DEMO_USERS[user]?.role === "coach" ? `/dashboard/${DEMO_BUSINESS.id}` : "/api/demo?user=user_demo_coach&to=dashboard"}>Owner Dashboard</a>
      {isPublicDemo && config.demoCtaUrl && (
        <a className="cta" href={config.demoCtaUrl} target="_blank" rel="noreferrer">
          Get Loopness
        </a>
      )}
    </div>
  );
}
