# Awgu StepForward — runbook

How to run, demo, check, reset and deploy the week-1 demo. This is a **non-sensitive demo with synthetic data only**; it is not production (see [Known limits](#known-limits)).

Commands are for Git Bash on Windows (they also work in macOS/Linux shells).

---

## 1. Run it locally

**Needs:** Docker Desktop, Bun 1.3+, uv, Node 20+.

Three terminals, from the repository root:

```bash
docker compose up -d                                   # 1. Postgres (container awgu-db)
```

```bash
cd backend && cp -n .env.example .env && uv sync && uv run uvicorn app.main:app --reload   # 2. API on :8000
```

```bash
cd apps/web && bun install && bun run dev              # 3. Web on :3000
```

- Open **http://localhost:3000** — use `localhost`, never `127.0.0.1`, or sign-in cookies are dropped (DECISIONS D19).
- On start the API applies migrations and seeds demo data (only when `ENVIRONMENT=development` and `DEV_BOOTSTRAP=true`). Allow ~30 s on first run.
- API docs: http://localhost:8000/docs. Health: http://localhost:8000/healthz.
- Search assistant: set `AI_ENABLED=true` in `backend/.env` and restart the API.

## 2. Demo accounts and data

**Demo mode** (`DEV_AUTH_ENABLED=true`) adds one-tap sample accounts to the sign-in page, and shows the code on screen when no real email is configured. Turn it off for real users; the sample accounts and phone option then disappear. See §8 to send real emailed codes.

Everyone signs in at **`/sign-in`** (header → **Sign in**). Under "Demo accounts", tap a role:

| Role | Account | Lands on |
|---|---|---|
| Applicant | `applicant@awgu.local` | `/account` |
| Provider | `provider@awgu.local` | `/providers` |
| Staff (admin) | `admin@awgu.local` | `/admin` |

Coming from a page (for example "Sign in to save" on a listing) returns you to that page instead. A "You're signed in" message confirms it; signing out shows "You're signed out" and goes home.

Seeded by `app/scripts/seed.py` and `app/scripts/seed_demo.py` (both safe to run again — they skip what exists):

- 3 verified providers: Awgu Skills Centre, Enugu State Education Trust, Awgu Market Traders Union.
- 6 published listings covering every category: training, apprenticeship, two scholarships, entry-level job, and adults-only paid construction work (with work terms).
- 2 approved support sessions (in person and online).

One browser window holds one signed-in person. Use a second window in Incognito to act as two roles at once.

## 3. Five-minute demo script

1. **Home** — illustrations, categories, featured listings, example stories (labelled illustrative). Toggle the sun/moon button.
2. **Directory** — filter by category and town; open *Market stall construction*: adults-only notice, pay, PPE, verified employer.
3. **Report** — "Report this listing" as a visitor → *Report received*.
4. **Applicant** — sign in, add a profile picture, create an 18+ profile, save a listing, apply in-platform to *Solar installation apprenticeship* (review → consent → receipt), open the application timeline; apply on the provider site for the scholarship and update its tracked status.
5. **Support session** — register with a reminder; places left drops.
6. **Provider** — create a *Local paid work* listing with work terms; submit for review.
7. **Staff** — approve it; handle the report (resolve / dismiss / suspend); in **Published listings & providers** close a listing early, suspend and restore a listing, suspend and restore a provider. Every action is audited.
8. **Reminders** — **Run reminder job**; the applicant's bell shows reminders for deadlines within 3 days.

## 4. Checks before a merge or deploy

```bash
cd backend && uv run pytest -q && uv run ruff check .
```

```bash
cd apps/web && bun run lint && bun run typecheck && bun run build
```

Expected (2026-10-15): 62 backend tests pass; lint, typecheck and build pass. An automated accessibility scan (axe, WCAG 2.1 A/AA + best practice) of `/`, `/opportunities`, a listing, `/sessions`, a session, the apply form, `/account`, `/providers` and `/admin` reports no issues.

## 5. Jobs

Once deployed, **both jobs run every hour** from GitHub Actions (`.github/workflows/scheduled-jobs.yml`, set up in §7.5). Locally, or any time, run them by hand:

| Job | Command (in `backend/`) | Also from |
|---|---|---|
| Reminders (saved deadlines ≤ 3 days, sessions ≤ 24 h) | `uv run python -m app.jobs.reminders` | Staff page → **Run reminder job** |
| Expire listings past their deadline | `uv run python -m app.jobs.expiry` | — (past-deadline listings are already hidden from the directory) |

Reminder emails are really delivered when an email provider is set (§8); otherwise they are only logged. Running a job twice is safe: nothing is expired or sent twice.

## 6. Reset the local data

```bash
docker compose down -v && docker compose up -d
```

Then restart the API: it recreates the tables and the demo data. To re-seed without wiping:

```bash
cd backend && uv run python -m app.scripts.seed && uv run python -m app.scripts.seed_demo
```

## 7. Deploy the demo (Neon + Render + Vercel)

Free plans are enough. Use the same region for the database and API (Frankfurt is closest to Nigeria).

### 7.1 Database — Neon
1. New project → **Connect** → turn **Connection pooling off** → copy the string.
2. Change `postgresql://` to `postgresql+asyncpg://` and replace everything after `?` with `ssl=require`. That is `DATABASE_URL`. (asyncpg rejects `sslmode` and `channel_binding`.)

### 7.2 API — Render (Web Service)

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Runtime | Python 3 |
| Build command | `pip install uv && uv sync --frozen --no-dev` |
| Start command | `.venv/bin/alembic upgrade head && .venv/bin/python -m app.scripts.seed && .venv/bin/python -m app.scripts.seed_demo && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips "*"` |
| Health check path | `/healthz` |

Environment:

| Key | Value |
|---|---|
| `PYTHON_VERSION` | `3.13.4` |
| `ENVIRONMENT` | `production` |
| `DATABASE_URL` | from 7.1 |
| `CORS_ORIGINS` | `["https://<your-app>.vercel.app"]` |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAMESITE` | `lax` |
| `DEV_AUTH_ENABLED` | `true` for the pitch (sample accounts); `false` for real users |
| `DEV_BOOTSTRAP` | `false` |
| `EMAIL_PROVIDER` | `brevo` (or `resend`); `console` sends nothing — see §8 |
| `EMAIL_API_KEY` | your provider API key (secret) |
| `EMAIL_FROM_ADDRESS` | the sender address you verified |
| `SMS_PROVIDER` | `console` |
| `AI_ENABLED` | `true` or `false` |
| `REPORT_HASH_SECRET` | a long random string |
| `JOBS_TOKEN` | another long random string (the hourly schedule's password, §7.5) |

### 7.3 Web — Vercel
- Root directory `apps/web`, framework Next.js, default build/install commands.
- Environment:

| Key | Value |
|---|---|
| `API_ORIGIN` | `https://<your-api>.onrender.com` (no trailing slash) |
| `NEXT_PUBLIC_API_BASE_URL` | `https://<your-app>.vercel.app` — the web app's **own** address |

`apps/web/next.config.ts` forwards `/api/*` to `API_ORIGIN`, so the browser only talks to the Vercel domain and the sign-in cookie is first-party. Both variables are read at **build** time: redeploy after changing them.

### 7.4 After deploying
- `https://<api>/healthz` returns OK; `https://<app>` lists opportunities.
- Sign in as the applicant, refresh: still signed in (also in Incognito).
- The free Render API sleeps after 15 minutes idle; the first request then takes ~50 s. Turn on keep-awake (§7.5) before a demo, or open the API URL a minute before.

### 7.5 Scheduled jobs and keep-awake (GitHub Actions)

The repository's workflow calls the API every hour to expire overdue listings and send reminders, and can ping it every 10 minutes so it doesn't fall asleep.

1. Make a token: run `python -c "import secrets; print(secrets.token_urlsafe(32))"` (or any long random string).
2. Render → your API → **Environment** → add `JOBS_TOKEN` = that value → save (it redeploys).
3. GitHub → your repo → **Settings → Secrets and variables → Actions**:
   - **Secrets** tab → *New repository secret*: `API_URL` = `https://<your-api>.onrender.com` (no trailing slash), and `JOBS_TOKEN` = the same value.
   - **Variables** tab → *New repository variable*: `KEEP_AWAKE` = `true` (optional; set it to `false` after the pitch).
4. GitHub → **Actions** → *Scheduled jobs* → **Run workflow** to test now. The log ends with `Done: {"expired_listings": …}`.

Notes:
- GitHub runs schedules in UTC and can start them a few minutes late. Keep-awake pings may occasionally miss, so still open the site a minute before you present.
- Render's free plan includes 750 hours a month, enough for one API kept awake all month.
- GitHub pauses schedules in a repository with no activity for 60 days; any push re-enables them.

### 7.6 Troubleshooting

| Symptom | Fix |
|---|---|
| Render: `sslmode` / `channel_binding` error | `DATABASE_URL` must end in `?ssl=require` |
| Render: `.venv/bin/...: not found` | Root directory must be `backend` |
| Site shows "We couldn't load…" | API asleep (wait and refresh) or wrong `API_ORIGIN` |
| Signed out after refresh / "Invalid or missing CSRF token" | `NEXT_PUBLIC_API_BASE_URL` must be the Vercel URL; redeploy |
| Vercel install fails | Set install command to `bun install` |

Rollback: Vercel → Deployments → a previous deployment → **Promote**; Render → Events → a previous deploy → **Rollback**. Migrations are forward-only; restore Neon from a branch/point-in-time if a migration must be undone.


## 8. Send real sign-in codes by email

The API emails codes through **Brevo** or **Resend** over HTTPS. (Classic SMTP such as Gmail won't work once deployed: Render's free plan blocks outgoing SMTP.)

| | Brevo (recommended to start) | Resend |
|---|---|---|
| Free allowance | 300 emails/day | 3,000/month, 100/day |
| Sender | verify a sender address; a domain you own is best | **a verified domain is required** to email anyone but yourself |

**Brevo:**
1. Create a free account at brevo.com.
2. *Senders, Domains & Dedicated IPs* → add and verify your sender address (or, better, authenticate a domain you own).
3. *SMTP & API* → *API keys* → create a key and copy it.
4. In `backend/.env` (local) or Render → Environment:
   ```
   EMAIL_PROVIDER=brevo
   EMAIL_API_KEY=<the key>
   EMAIL_FROM_ADDRESS=<the verified sender>
   ```
5. Restart the API. On `/sign-in`, enter your own email → **Send code** → the email arrives (check spam the first time).

**Resend:** the same, with `EMAIL_PROVIDER=resend`, after verifying a domain in Resend.

Tips:
- Emails from a free address (for example @gmail.com) sent through a provider can land in spam; a cheap domain with SPF/DKIM set up in the provider fixes that.
- If sending fails, the page says so and the API log shows the provider's reason (`EMAIL via brevo rejected …`). The API key is never logged.
- Keep `DEV_AUTH_ENABLED=true` during the pitch as a backup: the sample accounts still work if email is slow.

---

## Known limits

The demo meets the week-1 plan (`IMPLEMENTATION_PLAN.md`) but deliberately stops short of production:

- **Sign-in:** real one-time codes by **email** (Brevo or Resend, §8). Phone codes need a funded SMS sender (Termii), so phone sign-in only works in demo mode. While demo mode is on, anyone can use the sample accounts: turn it off before real users.
- **Messages:** email reminders are delivered through the same provider; SMS is console-only. Reminders and expiry run hourly via GitHub Actions (a stand-in for a proper worker; runs can start a few minutes late).
- **Assistant:** a rule-based interpreter, not an AI model (D22).
- **Adults only:** under-18 applicants are blocked; guardian consent and minor flows are not built.
- **Moderation:** restoring a provider does not restore its listings and sessions automatically; staff restore each listing. Support sessions can be suspended but not restored from the staff page yet.
- **Files:** no document uploads or object storage.
- **Offline:** basic loading/error/offline states only; no offline sync.
- **Mobile app:** not scaffolded (D13); the web app is the phone experience.
- **Images:** illustrations are placeholders (D23); the example stories are fictional and labelled.
- **Operations:** free plans (API sleeps, no SLA, single instance), no load testing, no penetration test, no privacy impact assessment. Data is synthetic and must stay that way.
- **Language:** English only (no Igbo yet).
