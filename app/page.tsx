import { isDemoMode } from "@/lib/config";
import { DEMO_BUSINESS, DEMO_EXPERIENCE_ID } from "@/lib/whop";

export default function Home() {
  return (
    <main>
      <div className="panel">
        <h1>ReviewLoop</h1>
        <p className="muted">Video feedback for coaching communities on Whop. Members send a video, coaches reply with timestamped feedback.</p>
        {isDemoMode ? (
          <>
            <p>Whop isn&apos;t connected yet, so this is running in demo mode with fake users. Try both sides:</p>
            <div className="row">
              <a className="btn primary" href={`/experiences/${DEMO_EXPERIENCE_ID}`}>
                Open the community view
              </a>
              <a className="btn" href={`/dashboard/${DEMO_BUSINESS.id}`}>
                Open the owner dashboard
              </a>
            </div>
            <p className="muted small" style={{ marginTop: 10 }}>
              Use the black bar at the top to switch between the coach and a member, or between plans. To connect Whop, follow CONNECT.md.
            </p>
          </>
        ) : (
          <p>This app runs inside Whop. Install it on a Whop business and open it from the sidebar.</p>
        )}
      </div>
    </main>
  );
}
