import { CoachView } from "@/components/CoachView";
import { MemberView } from "@/components/MemberView";
import { NotInWhop } from "@/components/NotInWhop";
import { PLANS } from "@/lib/config";
import { uploadTarget } from "@/lib/media";
import { resolvePlan } from "@/lib/plan";
import { coachBlocker, estimateWaitHours, monthSubmissions, queueFor, submissionBlocker } from "@/lib/reviews";
import { ensureBusiness, ensureMember, read } from "@/lib/store";
import { getExperienceViewer } from "@/lib/whop";

export const dynamic = "force-dynamic";

export default async function ExperiencePage({
  params,
  searchParams,
}: {
  params: Promise<{ experienceId: string }>;
  searchParams: Promise<{ view?: string; s?: string }>;
}) {
  const { experienceId } = await params;
  const sp = await searchParams;
  const viewer = await getExperienceViewer(experienceId).catch((e) => {
    console.error(e);
    return null;
  });
  if (!viewer) return <NotInWhop />;

  const business = await ensureBusiness(viewer.businessId, viewer.businessName);
  const member = await ensureMember(business.id, viewer.userId, viewer.name);
  const plan = await resolvePlan(business, viewer.role === "coach" ? viewer.userId : undefined);
  const features = PLANS[plan];
  const { subs, comments } = await read((db) => ({
    subs: Object.values(db.submissions).filter((s) => s.businessId === business.id),
    comments: Object.values(db.comments),
  }));
  const queue = queueFor(subs, business.id);

  if (viewer.role === "coach") {
    const recent = subs
      .filter((s) => s.status !== "queued")
      .sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""))
      .slice(0, 40);
    const visible = new Set([...queue, ...recent].map((s) => s.id));
    const used = monthSubmissions(subs, business.id).length;
    const queueNotice = business.settings.paused
      ? "New submissions are paused. Turn them back on in the owner dashboard."
      : used >= features.monthlySubmissions
        ? `This community used all ${features.monthlySubmissions} submissions on the ${features.label} plan this month, so new ones are paused.`
        : null;
    return (
      <main>
        <Header title="Reviews" subtitle={`${business.name}, ${features.label} plan`} />
        <CoachView
          experienceId={experienceId}
          queue={queue}
          recent={recent}
          comments={comments.filter((c) => visible.has(c.submissionId))}
          liveEnabled={features.liveMode}
          queueNotice={queueNotice}
          initialView={sp.view === "live" || sp.view === "done" ? sp.view : "queue"}
          initialId={sp.s ?? null}
          tools={{
            rubric: business.settings.rubric,
            snippets: business.settings.snippets,
            rubricsEnabled: features.rubrics,
            seatBlocker: coachBlocker(subs, business.id, plan, viewer.userId),
          }}
        />
      </main>
    );
  }

  const mine = subs.filter((s) => s.memberId === viewer.userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const positions = Object.fromEntries(queue.map((s, i) => [s.id, i + 1]));
  const myIds = new Set(mine.map((s) => s.id));
  const daysIn = (Date.now() - Date.parse(member.firstSeenAt)) / 86_400_000;
  const missionDays = business.settings.missionDays;
  const mission = mine.length === 0 && daysIn < missionDays ? { daysLeft: Math.max(1, Math.ceil(missionDays - daysIn)) } : null;

  return (
    <main>
      <Header title="Video feedback" subtitle={business.name} />
      <MemberView
        experienceId={experienceId}
        mine={mine}
        comments={comments.filter((c) => myIds.has(c.submissionId))}
        positions={positions}
        waitHours={estimateWaitHours(subs, business.id, queue.length + 1)}
        promiseHours={business.settings.promiseHours}
        blocker={submissionBlocker(subs, business, plan, viewer.userId)}
        mission={mission}
        liveEnabled={features.liveMode}
        uploadsEnabled={uploadTarget() !== null}
      />
    </main>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        <p className="sub">{subtitle}</p>
      </div>
    </header>
  );
}
