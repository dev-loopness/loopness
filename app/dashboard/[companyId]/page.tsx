import { NotInWhop } from "@/components/NotInWhop";
import { SettingsForm } from "@/components/SettingsForm";
import { checkoutUrl, isDemoMode, PLANS } from "@/lib/config";
import { resolvePlan } from "@/lib/plan";
import { activeCoaches, averageReviewHours, monthSubmissions, queueFor, startOfMonth } from "@/lib/reviews";
import { ensureBusiness, read } from "@/lib/store";
import { getDashboardViewer } from "@/lib/whop";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const viewer = await getDashboardViewer(companyId).catch((e) => {
    console.error(e);
    return null;
  });
  if (!viewer) return <NotInWhop />;

  const business = await ensureBusiness(viewer.businessId, viewer.businessName);
  const plan = await resolvePlan(business, viewer.userId);
  const features = PLANS[plan];
  const { subs, members, comments } = await read((db) => ({
    subs: Object.values(db.submissions).filter((s) => s.businessId === business.id),
    members: Object.values(db.members).filter((m) => m.businessId === business.id),
    comments: Object.values(db.comments),
  }));

  const month = monthSubmissions(subs, business.id);
  const queue = queueFor(subs, business.id);
  const coaches = activeCoaches(subs, business.id);
  const avgHours = averageReviewHours(subs, business.id);
  const submitters = new Set(subs.map((s) => s.memberId));
  const from = startOfMonth();

  const coachIds = new Set(subs.map((s) => s.reviewerId).filter(Boolean) as string[]);
  const workload = [...coachIds].map((id) => {
    const reviewed = subs.filter((s) => s.reviewerId === id && s.reviewedAt && s.reviewedAt >= from);
    const hours = reviewed.map((s) => (Date.parse(s.reviewedAt!) - Date.parse(s.createdAt)) / 3_600_000);
    return {
      id,
      name: reviewed[0]?.reviewerName ?? subs.find((s) => s.reviewerId === id)?.reviewerName ?? id,
      reviewed: reviewed.length,
      comments: comments.filter((c) => c.authorId === id && c.createdAt >= from).length,
      avgHours: hours.length ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10 : null,
    };
  });

  const seats = features.coachSeats === Infinity ? "unlimited" : features.coachSeats;

  return (
    <main>
      <div className="row between" style={{ marginBottom: 16 }}>
        <div>
          <h1>ReviewLoop</h1>
          <div className="muted small">{business.name} · owner dashboard</div>
        </div>
        <span className="badge">{features.label} plan</span>
      </div>

      <div className="stats" style={{ marginBottom: 16 }}>
        <div className="stat">
          <span className="muted small">Videos this month</span>
          <b>
            {month.length} <span className="muted small">/ {features.monthlySubmissions}</span>
          </b>
        </div>
        <div className="stat">
          <span className="muted small">Waiting for review</span>
          <b>{queue.length}</b>
        </div>
        <div className="stat">
          <span className="muted small">Average time to review</span>
          <b>{hrs(avgHours)}</b>
        </div>
        <div className="stat">
          <span className="muted small">Coaches reviewing this month</span>
          <b>
            {coaches.size} <span className="muted small">/ {seats}</span>
          </b>
        </div>
        <div className="stat">
          <span className="muted small">Members sending videos</span>
          <b>
            {submitters.size} <span className="muted small">of {members.length}</span>
          </b>
        </div>
      </div>

      <div className="grid2">
        <div>
          <div className="panel">
            <h2>Coach workload this month</h2>
            {features.workload ? (
              workload.length ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Coach</th>
                      <th>Reviewed</th>
                      <th>Comments</th>
                      <th>Avg time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workload.map((w) => (
                      <tr key={w.id}>
                        <td>{w.name}</td>
                        <td>{w.reviewed}</td>
                        <td>{w.comments}</td>
                        <td>{hrs(w.avgHours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted small">No reviews yet this month.</p>
              )
            ) : (
              <p className="muted small">See each coach&apos;s workload and review times on the Team plan.</p>
            )}
          </div>

          <div className="panel">
            <h2>Your plan</h2>
            <p>
              You&apos;re on <strong>{features.label}</strong> ({features.price}).
            </p>
            <ul className="small">
              <li>Free: 1 coach, 30 videos a month, queue and timestamped comments</li>
              <li>Pro $39/mo: 3 coaches, up to 1,000 videos, rubric scores, live session mode</li>
              <li>Team $99/mo: unlimited coaches, workload dashboard</li>
            </ul>
            <p className="small muted">Yearly plans are a fixed 12-month term at 10 months&apos; price. If you hit a limit, new submissions pause; there are never surprise charges.</p>
            <div className="row">
              {plan !== "pro" && plan !== "team" && <UpgradeLink plan="pro" />}
              {plan !== "team" && <UpgradeLink plan="team" />}
            </div>
            {isDemoMode && <p className="small muted" style={{ marginTop: 8 }}>Demo mode: switch plans with the bar at the top.</p>}
          </div>
        </div>

        <div className="panel">
          <h2>Settings</h2>
          <SettingsForm businessId={business.id} settings={business.settings} rubricsEnabled={features.rubrics} />
        </div>
      </div>
    </main>
  );
}

const hrs = (h: number | null) => (h === null ? "–" : h < 1 ? "under 1h" : `${h}h`);

function UpgradeLink({ plan }: { plan: "pro" | "team" }) {
  const url = checkoutUrl(plan);
  const label = `Upgrade to ${PLANS[plan].label}`;
  if (!url) return <button disabled title="Checkout link not set up yet">{label}</button>;
  return (
    <a className={`btn${plan === "pro" ? " primary" : ""}`} href={url} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}
