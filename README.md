# ReviewLoop

A Whop app for coaching communities: members send a video (upload up to 3 minutes, or a
YouTube/TikTok link) and coaches reply with timestamped feedback.

To connect it to Whop, see **CONNECT.md**.

## What's in this MVP

**Members (experience view, `/experiences/[experienceId]`)**
- Upload a video (MP4, MOV, WebM, up to 3 minutes / 250 MB) or paste a link
- See place in the queue and an honest wait estimate (switches from the coach's promise to the real estimate when reviews run late)
- "First video in 7 days" mission for new members
- Flag a video for the next live call (Pro and Team)
- Read timestamped feedback (click a time to jump there), scores and the coach's summary, reply, and send a new version

**Coaches (same view, Whop admins)**
- Review queue, oldest first
- Timestamped comments at the current playback time, or at a typed time like `1:05`
- Saved comments (snippets) in one click
- Rubric scores 1 to 5 (Pro and Team)
- Mark reviewed / needs revision / save draft
- Live session mode: step through videos flagged for the call; the next one opens when you finish (Pro and Team)

**Owners (dashboard view, `/dashboard/[companyId]`)**
- Videos this month vs. plan limit, queue size, average review time, coach seats, members sending videos
- Coach workload table (Team)
- Settings: pause submissions, review promise, max waiting videos per member, mission days, rubric, snippets
- Plan box with upgrade links to your Whop checkout

**Plans** (`lib/config.ts`): Free 1 coach / 30 videos; Pro $39 3 coaches / 1,000 videos / rubrics / live mode;
Team $99 unlimited coaches / 3,000 videos / workload. At a limit, new submissions pause; no overage charges.

Timestamps work on uploads and YouTube. TikTok uses TikTok's embed player and works when it reports
playback time; otherwise coaches type the time. Other links get general comments.

## Demo mode

With the Whop keys blank, a black bar at the top lets you switch between a coach and two members,
and between Free, Pro and Team, so every screen can be tried without Whop.

## Running it (for Claude Code)

```
npm install
npm run dev        # http://localhost:3000 in demo mode
npm run build && npm start
```

Storage is a JSON file plus an uploads folder under `DATA_DIR` (default `./data`). That's fine for
the first communities on one server with a persistent disk.

## Not built yet (version 2)

Peer review, shareable portfolios, automated pre-checks, ROI report, image review, data export button,
and moving storage to a hosted database plus video storage (for example Postgres and Cloudflare R2)
once there are more than a handful of communities.
