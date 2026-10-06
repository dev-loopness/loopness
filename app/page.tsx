import { ArrowRight, ChalkboardTeacher, ChartBar, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { config, isDemoMode, isPublicDemo } from "@/lib/config";
import { DEMO_BUSINESS, DEMO_EXPERIENCE_ID } from "@/lib/whop";

export const dynamic = "force-dynamic";

export default function Home() {
  if (isPublicDemo) return <PublicDemoHome />;
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

const ROLES = [
  {
    href: "/api/demo?user=user_demo_coach",
    icon: ChalkboardTeacher,
    title: "Coach view",
    text: "Work through the review queue, pin notes to the exact second, score a rubric, and run flagged videos on a live call.",
  },
  {
    href: "/api/demo?user=user_demo_alex",
    icon: VideoCamera,
    title: "Member view",
    text: "Send a video in a few taps, see your place in line, and read the coach's notes right on the timeline.",
  },
  {
    href: "/api/demo?user=user_demo_coach&to=dashboard",
    icon: ChartBar,
    title: "Owner dashboard",
    text: "See how fast videos get reviewed, which coach carries how much, and set your review promise.",
  },
];

function PublicDemoHome() {
  return (
    <main className="landing">
      <p className="eyebrow">ReviewLoop for Whop communities</p>
      <h1>Review member videos without the DM pile-up.</h1>
      <p className="lede">
        Members send a form check, an edit or a practice take. Your coaches pin feedback to the exact second, score it, and clear the
        queue in one place inside your Whop.
      </p>

      <h2 className="small muted" style={{ marginTop: 36, fontWeight: 500 }}>
        Click through a sample community
      </h2>
      <ul className="roles">
        {ROLES.map(({ href, icon: Icon, title, text }) => (
          <li key={title}>
            <a href={href} className="surface role">
              <Icon size={22} aria-hidden="true" />
              <strong>
                {title} <ArrowRight size={14} weight="bold" aria-hidden="true" />
              </strong>
              <span className="small muted">{text}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="xs faint" style={{ marginTop: 12 }}>
        The members and videos are made up. What you click stays private to you and resets after a day away.
      </p>

      <section className="surface pad" style={{ marginTop: 36 }}>
        <h2>Want this in your community?</h2>
        <p className="small muted" style={{ marginTop: 6 }}>
          ReviewLoop installs into your Whop as an app, so members use it without a new login. Questions? Reply to the DM that brought
          you here.
        </p>
        {config.demoCtaUrl && (
          <a className="btn btn-primary btn-lg" style={{ marginTop: 14 }} href={config.demoCtaUrl} target="_blank" rel="noreferrer">
            Get ReviewLoop on Whop
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </a>
        )}
      </section>
    </main>
  );
}
