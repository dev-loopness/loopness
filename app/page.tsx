import { isDemoMode } from "@/lib/config";
import { DEMO_BUSINESS, DEMO_EXPERIENCE_ID } from "@/lib/whop";

export default function Home() {
  return (
    <main style={{ maxWidth: 640, paddingTop: 64 }}>
      <h1 style={{ fontSize: 24 }}>ReviewLoop</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        Members send a video. Coaches pin feedback to the exact second it matters.
      </p>
      {isDemoMode ? (
        <>
          <p style={{ marginTop: 24 }}>Whop isn&apos;t connected yet, so this runs with test users. Try both sides:</p>
          <div className="row" style={{ marginTop: 12 }}>
            <a className="btn btn-primary btn-lg" href={`/experiences/${DEMO_EXPERIENCE_ID}`}>
              Open Community View
            </a>
            <a className="btn btn-lg" href={`/dashboard/${DEMO_BUSINESS.id}`}>
              Open Owner Dashboard
            </a>
          </div>
          <p className="small muted" style={{ marginTop: 16 }}>
            Use the bar at the top to switch between a coach and a member, or between plans. CONNECT.md explains how to connect Whop.
          </p>
        </>
      ) : (
        <p style={{ marginTop: 24 }}>ReviewLoop runs inside Whop. Install it on your business and open it from the sidebar.</p>
      )}
    </main>
  );
}
