"use client";

import { useRouter } from "next/navigation";

export function DemoSwitcher(props: { users: { id: string; name: string }[]; user: string; plan: string }) {
  const router = useRouter();
  const set = async (body: Record<string, string>) => {
    await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    router.refresh();
  };
  return (
    <>
      <span>I am</span>
      <select value={props.user} onChange={(e) => set({ user: e.target.value })}>
        {props.users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <span>Plan</span>
      <select value={props.plan} onChange={(e) => set({ plan: e.target.value })}>
        <option value="free">Free</option>
        <option value="pro">Pro</option>
        <option value="team">Team</option>
      </select>
    </>
  );
}
