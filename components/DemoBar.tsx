import { cookies } from "next/headers";
import { DEMO_BUSINESS, DEMO_EXPERIENCE_ID, DEMO_USERS } from "@/lib/whop";
import { DemoSwitcher } from "./DemoSwitcher";

export async function DemoBar() {
  const jar = await cookies();
  const user = jar.get("rl_demo_user")?.value ?? "user_demo_coach";
  const plan = jar.get("rl_demo_plan")?.value ?? "pro";
  return (
    <div className="demobar">
      <strong>Demo mode</strong>
      <span>Whop isn&apos;t connected yet, so you&apos;re using fake users.</span>
      <DemoSwitcher
        users={Object.entries(DEMO_USERS).map(([id, u]) => ({ id, name: u.name }))}
        user={user}
        plan={plan}
      />
      <a href={`/experiences/${DEMO_EXPERIENCE_ID}`}>Community view</a>
      <a href={`/dashboard/${DEMO_BUSINESS.id}`}>Owner dashboard</a>
    </div>
  );
}
