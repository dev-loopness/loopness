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

How plans work: when a community owner opens the ReviewLoop dashboard, the app checks whether they
hold an active Pro or Team membership in your business. If yes, their whole community gets that plan.
If these blanks stay empty, every community is treated as Free.

## 3. Settings to type into the Whop developer app

In the developer dashboard, on the app's hosting / views settings:

| Whop setting | Type this |
|---|---|
| Base URL | Your app's web address (the same as `APP_URL`) |
| Experience path | `/experiences/[experienceId]` |
| Dashboard path | `/dashboard/[companyId]` |

If Whop asks which permissions the app needs, allow it to read users and experiences, check
access, and read memberships.

## 4. Hosting (needed before real members can use it)

The app has to run on a server that Whop can reach. Because it saves videos to disk, pick a host
with a **persistent disk**, for example Railway or Render (roughly $5-10/month). On the host:

1. Create a service from this code (Claude Code can do this once GitHub is connected).
2. Add a persistent disk/volume, for example mounted at `/data`, and set `DATA_DIR=/data`.
3. Paste every value from sections 1 and 2 into the host's environment variables page.
4. Copy the host's web address into `APP_URL` and into Whop's Base URL.

Then install the app on a test business and open it from the sidebar: admins see the review queue,
members see the "Get feedback on a video" page.

## Checklist

- [ ] `WHOP_APP_ID`
- [ ] `NEXT_PUBLIC_WHOP_APP_ID`
- [ ] `WHOP_API_KEY`
- [ ] `REVIEWLOOP_BUSINESS_ID`
- [ ] `REVIEWLOOP_BUSINESS_API_KEY`
- [ ] `WHOP_PRO_PLAN_ID` (+ yearly)
- [ ] `WHOP_TEAM_PLAN_ID` (+ yearly)
- [ ] `APP_URL` and `DATA_DIR` (when hosted)
- [ ] Base URL, Experience path, Dashboard path typed into Whop
