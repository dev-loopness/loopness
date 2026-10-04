import { cookies } from "next/headers";
import { DEMO_BUSINESS, DEMO_EXPERIENCE_ID, DEMO_USERS } from "@/lib/whop";
import { DemoSwitcher } from "./DemoSwitcher";

export async function DemoBar() {
  const jar = await cookies();
  const user = jar.get("rl_demo_user")?.value ?? "user_demo_coach";
  const plan = jar.get("rl_demo_plan")?.value ?? "pro";
  return (
    <div className="demobar" role="region" aria-label="Demo controls">
      <strong>Demo mode</strong>
      <span>Whop isn&apos;t connected, so these are test users.</span>
      <DemoSwitcher users={Object.entries(DEMO_USERS).map(([id, u]) => ({ id, name: `${u.name} (${u.role})` }))} user={user} plan={plan} />
      <span className="spacer" />
      <a href={`/experiences/${DEMO_EXPERIENCE_ID}`}>Community View</a>
      <a href={`/dashboard/${DEMO_BUSINESS.id}`}>Owner Dashboard</a>
    </div>
  );
}
