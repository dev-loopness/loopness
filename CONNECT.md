# Connecting ReviewLoop to Whop

Right now every Whop setting is blank, so the app runs in **demo mode** with fake users.
This page lists each blank, where to find the value on Whop, and where to paste it.

**Never paste these values into a chat.** They go straight into your hosting provider's
"Environment variables" page (or into a file called `.env.local` if the app runs on your own computer).
Use `.env.example` as the list of names.

## 1. Values from your Whop developer app

Go to **whop.com/dashboard/developer** and open the ReviewLoop app you registered in stage 1.

| Blank in `.env.example` | What to copy | Looks like |
|---|---|---|
| `WHOP_APP_ID` | The app's ID | `app_...` |
| `NEXT_PUBLIC_WHOP_APP_ID` | The same app ID again | `app_...` |
| `WHOP_API_KEY` | The app's API key (click to reveal or create one). Secret. | a long random string |

As soon as `WHOP_APP_ID` and `WHOP_API_KEY` are filled in, demo mode switches off and the app
only works when opened inside Whop.

## 2. Values from your own ReviewLoop business (stage 2: the plans you sell)

| Blank | What to copy | Where |
|---|---|---|
| `REVIEWLOOP_BUSINESS_ID` | Your business ID | Business settings, or the `biz_...` part of your dashboard web address |
| `REVIEWLOOP_BUSINESS_API_KEY` | A business API key that can read memberships. Secret. | Business settings → API keys → create key |
| `WHOP_PRO_PLAN_ID` | The monthly Pro ($39) plan | Products → ReviewLoop → Pro plan → copy plan ID (`plan_...`) |
| `WHOP_PRO_YEARLY_PLAN_ID` | The yearly Pro plan, if you made one | same place |
| `WHOP_TEAM_PLAN_ID` | The monthly Team ($99) plan | same place |
| `WHOP_TEAM_YEARLY_PLAN_ID` | The yearly Team plan, if you made one | same place |
| `WHOP_LAUNCH_PACK_PLAN_ID` | The Launch Pack ($790, one payment) | Products → Launch Pack → copy plan ID (`plan_...`) |
| `WHOP_SCALE_PACK_PLAN_ID` | The Scale Pack ($1,490, one payment) | Products → Scale Pack → copy plan ID (`plan_...`) |

How plans work: when a community owner opens the ReviewLoop dashboard, the app checks whether they
hold an active Pro or Team membership in your business. If yes, their whole community gets that plan.
A Launch Pack buyer gets Pro and a Scale Pack buyer gets Team, each for 12 months from the day they paid;
the app ends it on its own after that, so the term is fixed. If these blanks stay empty, every community is treated as Free.

Making the two packages on Whop: create a product for each, with a **one-time** price ($790 and $1,490), and put the
14-day refund promise in the description. If Whop asks how long access lasts, pick 365 days.

## 3. Video storage: Cloudflare R2

Uploaded videos are stored in Cloudflare R2, not on the server, because a cheap server disk fills up within the
first months. R2 has no download fees and a free allowance of 10 GB; after that it's about $0.015 per GB per month.

1. Create a free Cloudflare account at dash.cloudflare.com and open **R2 Object Storage** (it asks for a card, even on the free allowance).
2. Click **Create bucket**, name it `reviewloop-videos`, and keep it private (the default).
3. Go to **R2 → Manage API tokens → Create API token**. Choose **Object Read & Write**, limit it to the `reviewloop-videos` bucket, and create it.
4. Copy these values from the page that appears (it only shows the secret once):

| Blank | What to copy |
|---|---|
| `R2_ACCOUNT_ID` | Your account ID (also shown on the R2 overview page) |
| `R2_ACCESS_KEY_ID` | Access Key ID. Secret. |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key. Secret. |
| `R2_BUCKET` | `reviewloop-videos` (the name you chose) |

Until these are filled in, demo mode saves videos on the computer running the app. Once Whop is connected, members
can still paste YouTube or TikTok links without R2, but the "Upload File" option stays switched off.

## 4. Settings to type into the Whop developer app

In the developer dashboard, on the app's hosting / views settings:

| Whop setting | Type this |
|---|---|
| Base URL | Your app's web address (the same as `APP_URL`) |
| Experience path | `/experiences/[experienceId]` |
| Dashboard path | `/dashboard/[companyId]` |

If Whop asks which permissions the app needs, allow it to read users and experiences, check
access, and read memberships.

## 5. Hosting on Railway (needed before anyone can install it)

The app has to run on a server Whop can reach. Railway costs about $5/month plus usage. All of this is clicks:

1. Go to **railway.com**, sign in with GitHub, and pick the Hobby plan.
2. **New Project → Deploy from GitHub repo → dev-loopness/loopness.** Railway finds the code and builds it on its own.
3. Open the service, go to **Variables → Raw Editor**, and paste every line from sections 1, 2 and 3 in the form
   `NAME=value`, one per line. Add `DATA_DIR=/data`.
4. Right-click the service (or use the command palette) → **Attach volume**, mount path `/data`. This keeps the app's records
   when it restarts.
5. **Settings → Networking → Generate Domain.** Copy the address it gives you (like `https://loopness-production.up.railway.app`).
6. Add one more variable, `APP_URL=` that address, and paste the same address into Whop's Base URL (section 4).
7. Railway redeploys by itself after each change. When the deploy shows green, install the app on a test business on Whop
   and open it from the sidebar: admins see the review queue, members see "Get feedback on a video".

## 6. Public demo for DMs (a second Railway service)

A click-through demo you can paste into DMs instead of offering a call. It runs the same code with no Whop keys, so
nothing in it touches real customers.

1. In the same Railway project: **New → GitHub Repo → dev-loopness/loopness** again. This makes a second service.
2. In its **Variables**, add only these (no Whop, R2 or `DATA_DIR` values, and no volume):

| Variable | Value |
|---|---|
| `PUBLIC_DEMO` | `1` |
| `PUBLIC_DEMO_CTA_URL` | Your ReviewLoop product page on Whop (where owners buy) |
| `PUBLIC_DEMO_VIDEOS` | Optional. Up to 3 YouTube links of your demo recordings, separated by commas |

3. **Settings → Networking → Generate Domain.** That address is the link you send in DMs.

Each visitor gets their own sample community with videos, timestamped notes and scores, so prospects never see each
other's clicks. Uploads are switched off (visitors can paste YouTube or TikTok links). A visitor's sample community is
deleted after a day without visits, and at most 500 are kept. Records reset when the service redeploys, which is fine
for a demo.

## Checklist

- [ ] `WHOP_APP_ID`
- [ ] `NEXT_PUBLIC_WHOP_APP_ID`
- [ ] `WHOP_API_KEY`
- [ ] `REVIEWLOOP_BUSINESS_ID`
- [ ] `REVIEWLOOP_BUSINESS_API_KEY`
- [ ] `WHOP_PRO_PLAN_ID` (+ yearly)
- [ ] `WHOP_TEAM_PLAN_ID` (+ yearly)
- [ ] `WHOP_LAUNCH_PACK_PLAN_ID` and `WHOP_SCALE_PACK_PLAN_ID`
- [ ] `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- [ ] `APP_URL` and `DATA_DIR` (when hosted)
- [ ] Base URL, Experience path, Dashboard path typed into Whop
- [ ] Public demo service: `PUBLIC_DEMO=1`, `PUBLIC_DEMO_CTA_URL` (optional `PUBLIC_DEMO_VIDEOS`)
