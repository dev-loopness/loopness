import { NotInWhop } from "@/components/NotInWhop";
import { SettingsForm } from "@/components/SettingsForm";
import { checkoutUrl, config, isDemoMode, isPublicDemo, PLANS } from "@/lib/config";
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

  const planRows: { key: "free" | "pro" | "team"; text: string }[] = [
    { key: "free", text: "1 coach, 30 videos a month, queue and timestamped comments" },
    { key: "pro", text: "$39/mo. 3 coaches, up to 1,000 videos, rubric scores, live sessions" },
    { key: "team", text: "$99/mo. Unlimited coaches, up to 3,000 videos, coach workload" },
  ];

  return (
    <main>
      <header className="page-head">
        <div>
          <h1>Loopness</h1>
          <p className="sub">{business.name}</p>
        </div>
        <span className="pill accent">{features.label} plan</span>
      </header>

      <dl className="metrics">
        <div className="metric">
          <dt>Videos this month</dt>
          <dd>
            {fmt.format(month.length)} <small>of {fmt.format(features.monthlySubmissions)}</small>
          </dd>
        </div>
        <div className="metric">
          <dt>Waiting for review</dt>
          <dd>{fmt.format(queue.length)}</dd>
        </div>
        <div className="metric">
          <dt>Average time to review</dt>
          <dd>{hrs(avgHours)}</dd>
        </div>
        <div className="metric">
          <dt>Coaches reviewing</dt>
          <dd>
            {coaches.size} <small>of {seats}</small>
          </dd>
        </div>
        <div className="metric">
          <dt>Members sending videos</dt>
          <dd>
            {submitters.size} <small>of {members.length}</small>
          </dd>
        </div>
      </dl>

      <div className="split" style={{ gridTemplateColumns: "minmax(0, 6fr) minmax(0, 5fr)" }}>
        <div className="stack" style={{ gap: 20 }}>
          <section className="surface pad" aria-labelledby="workload">
            <h2 id="workload" style={{ marginBottom: 10 }}>
              Coach workload this month
            </h2>
            {features.workload ? (
              workload.length ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Coach</th>
                      <th scope="col">Reviewed</th>
                      <th scope="col">Comments</th>
                      <th scope="col">Avg time</th>
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
                <p className="small muted">Once coaches start reviewing, you&apos;ll see who is carrying how much here.</p>
              )
            ) : (
              <p className="small muted">See each coach&apos;s reviews and turnaround on the Team plan.</p>
            )}
          </section>

          <section className="surface pad" aria-labelledby="plan">
            <h2 id="plan">Plan</h2>
            <ul className="plans">
              {planRows.map((r) => (
                <li key={r.key} aria-current={plan === r.key}>
                  <strong>{PLANS[r.key].label}</strong>
                  <span className="muted">{r.text}</span>
                </li>
              ))}
            </ul>
            <p className="xs muted">Yearly plans are a fixed 12-month term at 10 months&apos; price. At a limit, new videos pause. There are never extra charges.</p>
            <div className="row" style={{ marginTop: 12 }}>
              {plan === "free" && <UpgradeLink plan="pro" />}
              {plan !== "team" && <UpgradeLink plan="team" />}
              {isDemoMode && <span className="xs faint">Demo: switch plans in the top bar.</span>}
            </div>
          </section>
        </div>

        <section className="surface pad" aria-labelledby="settings">
          <h2 id="settings" style={{ marginBottom: 14 }}>
            Settings
          </h2>
          <SettingsForm businessId={business.id} settings={business.settings} rubricsEnabled={features.rubrics} />
        </section>
      </div>
    </main>
  );
}

const fmt = new Intl.NumberFormat("en-US");
const hrs = (h: number | null) => (h === null ? "None yet" : h < 1 ? "Under 1h" : `${h}h`);

function UpgradeLink({ plan }: { plan: "pro" | "team" }) {
  const url = isPublicDemo ? config.demoCtaUrl || null : checkoutUrl(plan);
  const label = `Upgrade to ${PLANS[plan].label}`;
  if (!url)
    return (
      <button disabled title="Checkout link not set up yet" className={plan === "pro" ? "btn-primary" : undefined}>
        {label}
      </button>
    );
  return (
    <a className={`btn${plan === "pro" ? " btn-primary" : ""}`} href={url} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}
