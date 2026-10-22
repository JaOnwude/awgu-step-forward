# Decisions — Awgu StepForward (week-1 demo)

**Updated:** 2026-10-14
**Purpose:** Records the week-1 defaults and every place the build deviates from `../spec.md`, `../frontend-spec.md` or the docs in this folder (required by `../IMPLEMENTATION_PLAN.md` §7). A decision here does not override `spec.md`; it explains a temporary, reversible choice for the demo. Change a decision by editing its status and adding the reason.

Status values: **Adopted** (in force), **Deferred** (spec requirement postponed past week 1), **Proposed** (needs owner confirmation).

## Week-1 defaults (from `IMPLEMENTATION_PLAN.md` §2)

| # | Decision | Status | Where it stands |
|---|---|---|---|
| D1 | Web auth is an HttpOnly, SameSite session cookie (`awgu_session`) plus a CSRF cookie and `X-CSRF-Token` header. No tokens in localStorage. | Adopted | Built (Day 1/4). |
| D2 | One-time codes in dev/test mode: logged on the server and returned in a dev-only `dev_code` field. No live SMS. | Adopted | Built (Day 4). |
| D3 | Email goes through an `EmailAdapter`; `ConsoleEmailAdapter` by default, Brevo stubbed behind config. | Adopted | Planned for Day 6. |
| D4 | SMS goes through an `SmsAdapter`; `ConsoleSmsAdapter` only. Termii not wired. | Adopted | Planned for Day 6. |
| D5 | Files go through a `FileStorage` interface backed by a local private directory. No S3 provider chosen. | Adopted | No uploads in week 1. |
| D6 | AI behind `AI_ENABLED=false`; the assistant returns the same results as ordinary filters. | Adopted | Planned for Day 6. |
| D7 | Minor accounts disabled. Age band is captured, and under-18s cannot create a profile, apply or register. No guardian flow. | Adopted | Enforced server-side in `applicant` and `applications` services. |
| D8 | Android is limited to a scaffold and a shared tokens/API-client plan. | Adopted | See D13. |
| D9 | "48 hours" is shown as an initial response target only; no SLA computation. | Adopted | — |
| D10 | Synthetic data only. No real applicant data, documents or PII. | Adopted | Seeds in `backend/app/scripts/`. |

## Deviations and later decisions

### D11 — shadcn/ui and TanStack Query adopted
**Status:** Adopted (2026-10-14, owner decision — replaces the earlier proposal to defer them)
**Spec says:** the web client uses shadcn/ui primitives and TanStack Query for server state (`spec.md` Web and PWA; `frontend-spec.md` §3).
**Built:**
- shadcn/ui (new-york style) in `apps/web/src/components/ui/`, configured by `apps/web/components.json`. shadcn token names (`card`, `muted`, `accent`, `destructive`, `input`…) are aliases of the existing brand tokens in `globals.css`, so Light/Dark and contrast are unchanged. Because shadcn uses `accent` for hover backgrounds, the brand orange is now `highlight`.
- A `NativeSelect` primitive is used instead of the Radix `Select` for ordinary choices: it is lighter on low-end phones and uses the platform picker.
- TanStack Query owns all browser-side server state. The provider is `src/lib/query/provider.tsx` (one client per browser, a fresh one per server request; 4xx errors are not retried; writes are never auto-retried). Keys live in `src/lib/query/keys.ts`; account hooks in `src/features/account/queries.ts`. Sign-in and sign-out reset every private query so one user's data never shows for another.
- Shared loading, error, offline and permission states are in `src/components/shared/query-states.tsx` (spec R49–R51).
- Public pages stay as Server Components that fetch directly; the directory filter stays a plain GET form, so it works without JavaScript.

### D19 — Web app must call the API on `localhost`, not `127.0.0.1`
**Status:** Adopted (2026-10-14)
**Found:** the web app defaulted to `http://127.0.0.1:8000` while it runs on `http://localhost:3000`. Browsers treat these as different sites, so the `SameSite=Lax` session cookie was not sent and the page could not read the CSRF cookie. Sign-in appeared to succeed but did not stick.
**Fix:** the default API URL and `.env.example` now use `http://localhost:8000`. For deployment, the web and API must share a site (for example `app.example.ng` and `api.example.ng`), or the cookie settings need an ADR.

### D12 — No generated OpenAPI client or shared packages yet
**Status:** Deferred
**Spec says:** generate TypeScript clients from FastAPI OpenAPI into `packages/api-client`; share `packages/domain` and `packages/design-tokens` (`spec.md` API; `docs/API-CONTRACT.md` §6).
**Built:** hand-written clients in `apps/web/src/lib/api/`. `packages/` is empty.
**Risk:** front-end and back-end shapes can drift. Mitigation until then: keep types in `src/lib/api/` next to the endpoint they call and change both sides in the same slice.
**Revisit:** with the Android scaffold (D13), which is the first real second consumer.

### D13 — Android scaffold not created yet
**Status:** Deferred
**Plan says:** `apps/mobile/` Expo scaffold in week 1.
**Built:** nothing yet. The root `package.json` already has `dev:mobile` and `typecheck:mobile` scripts so they work once `apps/mobile` exists.
**Revisit:** Day 7 if time allows; otherwise the follow-on Android release.

### D14 — Account recovery is "request a new code"
**Status:** Adopted (2026-10-14)
**Context:** the owner asked about a forgotten-password flow. Sign-in uses one-time codes sent to a verified phone or email, so there is no password to reset.
**Decision:** recovery is requesting a new code to the same destination, under the existing resend cooldown and attempt limits. No password field or reset flow is added in week 1. Recovery when the user has lost access to their phone or email is a later support workflow (spec Milestone 2, "account recovery").

### D15 — Adults-only rule for work listings
**Status:** Adopted (2026-10-14)
**Spec says:** construction-site labor is restricted to verified adults (R22a), and age rules are enforced by the API (R22b).
**Built:** `local_work` and `contract` listings, and any listing whose work terms set `adult_only_construction`, are adults-only. On create or edit, a missing `min_age` is set to 18, and a `min_age` below 18 is rejected (422). At apply time the API uses the higher of the listing's `min_age` and 18 for these listings. Becoming adults-only on an approved listing is a material change and sends it back to review. Code: `backend/app/features/opportunities/service.py` (`requires_adult`, `effective_min_age`).
**Note:** treating `contract` as work is a policy reading of R1 ("short-term labor contracts"). Narrow it if contracts turn out to be professional engagements.

### D16 — Single server-side session instead of access/refresh tokens
**Status:** Adopted for week 1
**Spec says:** short-lived access tokens with rotating refresh tokens (`spec.md` Authentication).
**Built:** one opaque server-side session per sign-in (D1). This is simpler and revocable, and meets the TRD baseline for web. Revisit when the Android client needs platform-stored credentials.

### D17 — Spec "Must" items scheduled into the remaining days
**Status:** Adopted (2026-10-14)
These spec requirements were not in the original week-1 plan and were not listed as deferred. They are now scheduled in `IMPLEMENTATION_PLAN.md` §4:
- External application tracking (journey 5, R28): Day 6.
- `POST /reports` and a basic staff report queue (R21): Day 6.
- Moderation restore and expire actions (R20): Day 7.

### D18 — Backend tests run on SQLite in memory
**Status:** Adopted for week 1
Tests use `sqlite+aiosqlite` for speed. Production and local dev use PostgreSQL, so Postgres-specific behaviour (constraints, timezone handling) is checked by running the app locally against Docker Postgres. Add a Postgres CI job before pilot.

### D20 — How application-support sessions work in week 1
**Status:** Adopted (2026-10-14)
**Spec says:** approved organizers submit sessions, staff approve before public listing, capacity is enforced, reminders follow channel preferences, and the organizer roster omits unneeded applicant data (R33–R38, A5).
**Built** (`backend/app/features/sessions/`):
- **Organizers are members of verified providers.** There is no separate mentor role yet; a provider member proposes sessions for their organisation.
- **Approval:** new sessions are `pending_review` and appear only to the organisation and staff until approved. Staff can approve, reject (with reason) or suspend, and every decision is audited.
- **Capacity:** registration locks the session row (`SELECT … FOR UPDATE` on PostgreSQL) and counts active registrations before inserting, so two people cannot take the last place. The database also enforces `capacity > 0`.
- **Who can register:** adults with an applicant profile only (D7). Registering twice returns the same registration. Registration and cancelling close when the session starts.
- **Roster (R38):** shows the preferred name, registration status and attendance only — no contact details, date of birth or profile. Viewing a roster and recording attendance are audited (R44).
- **Reminders (R34):** the applicant's opt-in is stored on the registration; sending is part of the Day 6 notifications slice.
- **Not built yet:** printable roster, sessions for minors (needs the guardian flow), editing a session after submission, and organizer follow-up resources.

### D21 — Brand and visual design system (redesign)
**Status:** Adopted (2026-10-14, owner request to overhaul the UI)
**Spec says:** an original, warm, editorial, locally grounded brand with documented tokens; the design brief is `ui-generation-prompt.md` (`frontend-spec.md` §5).
**Decided:**
- **Typography:** Fraunces (display/headlines) + Plus Jakarta Sans (UI/body), both SIL OFL, loaded via `next/font`. These replace Geist.
- **Logo:** three rising steps toward a sun, with an "AWGU / StepForward" stacked wordmark. This replaces the placeholder "A" square.
- **Palette:** forest green primary, laterite highlight, sun accent, ink on cream paper, plus semantic verified/success/warning/danger roles, all with dark-mode values. Token values live in `design/mockups/styles.css`.
- **Mockups:** a high-fidelity HTML board at `design/mockups/index.html`, covering brand, foundations, components, 6 web screens and 4 mobile screens. See `design/README.md`.
- **DaisyUI is not used.** The spec forbids layering a second component library on shadcn/ui ("adapt them consistently instead of layering a second component library"), and DaisyUI would duplicate buttons, cards and badges and add CSS weight for low-end phones. The owner confirmed shadcn only.
- **Figma:** a Figma file was created, but the Starter plan's AI tool-call limit blocked the build. The owner chose the HTML board instead; it can be imported into Figma later.
**Implemented** in `apps/web` (2026-10-14): tokens and fonts in `globals.css`/`layout.tsx`, the `Logo` component and `app/icon.svg`, restyled shadcn primitives and status badges, a new header (active links, icon theme switch, account avatar), a phone bottom tab bar and an ink footer, and every screen rebuilt to the mockups. The Day-1 "admin check" demo panel was removed from the home page. The mobile mockups remain the reference for the Expo app.

### D22 — How Day 6 works (reports, tracking, notifications, assistant)
**Status:** Adopted (2026-10-14)
- **Reports (R21, R45):** anyone can report a public listing or session, signed in or not. Signed-in reports must carry the CSRF token. To limit abuse without storing IP addresses, each report keeps a salted SHA-256 fingerprint (`REPORT_HASH_SECRET` + client address + user id), capped at 5 per hour. Fee requests, fraud, unsafe work and harassment are urgent (24 h target); others have a 48 h target. Staff see neither the reporter nor the fingerprint. Suspending from a report uses the normal moderation services, so it is audited the same way.
- **External tracking (R28, journey 5):** a record is created only when the applicant clicks "Apply on provider site" (while signed in) or "I'll apply in person — track it". Statuses (started → completed) are always source `applicant` and shown as "Reported by you · not confirmed". The private note is never shared.
- **Notifications (R34–R37):** in-app is always on. Email and SMS can be chosen only with a verified address for that channel. Marketing is a separate opt-in, off by default. Week-1 adapters are console-only (D3/D4): messages are logged with masked recipients and never delivered. Reminders are deduplicated per channel; delivery failures are recorded on the notification row and never block other flows. The reminder job runs by hand (CLI or staff button) until a scheduler exists.
- **Assistant (R46–R48, D6):** off unless `AI_ENABLED=true`. When on, a rule-based interpreter (no external model, `rule-based-interpreter-v1`) maps plain words to the ordinary search filters, explains each mapping, and returns ordinary listing cards. It removes emails, phone numbers and long ID numbers before processing, and `AIUsageEvent` stores filters, listing ids, timing and outcome — never the query text. A model-backed interpreter can replace it behind `interpret()` after a data-processing review.
- **Hydration-safe session state:** `useCurrentUser()` reports "pending" until hydration finishes, because streamed page segments could otherwise see a user already loaded by the header and cause React hydration mismatches.

### D23 — Illustrations, motion and a single theme button
**Status:** Adopted (2026-10-15, tutor feedback: the product needs visuals that appeal to young people)
- **Images:** flat illustrations of fictional young Black Nigerians, one per category (scholarship, training, apprenticeship, jobs, local paid work), plus hero, support sessions and providers scenes. They are drawn by `apps/web/scripts/make-illustrations.mjs` (`bun run images`) and saved as `.webp` (about 10–15 KB each) in `apps/web/public/images/`. They are placeholders: replace a file with a real photo of the same name and 3:2 shape.
- **Loading:** `next/image` serves sized versions per screen. The hero, detail-page banner and page-header images load eagerly because they are above the fold; every other image (category tiles, listing cards, stories) lazy-loads. All are decorative (`alt=""`) because the text beside them carries the meaning.
- **Motion:** sections fade and rise in on scroll (`Reveal`), cards lift and images zoom slightly on hover, and the hero help card drifts gently. None of it runs for visitors who ask for reduced motion, and content stays visible if scripts don't run.
- **Stories carousel:** swipe or use the arrows and dots. It does not autoplay (moving content is hard to read and costs data). The stories are fictional and labelled "illustrative, not real users".
- **Theme:** one header button swaps light/dark (moon in light mode, sun in dark mode). The "system" button was removed; until a visitor taps the button, the site follows the device setting. The footer copy of the switch was removed, so phones get it in the header too.

### D24 — How Day 7 works (restore, expire, provider suspension, stabilising)
**Status:** Adopted (2026-10-15)
- **Listing actions (R20):** staff can now **restore** a suspended listing (reason required; only if its provider is verified) and **expire** (close early) a live listing (reason optional). Each action is allowed only from the right state, otherwise 409, and is audited as `listing.restore` / `listing.expire`. An expired listing leaves the directory but its page still opens and says it has closed, like a passed deadline.
- **Provider actions (R20):** staff can **suspend** a verified provider and **restore** a suspended one (rationale required, audited as `provider.suspended` / `provider.restored`). Suspending a provider also suspends each of its live listings and sessions, each audited, so the existing public rules hide them everywhere (directory, detail, apply, register, reports) without new checks. Restoring the provider does **not** bring them back automatically: staff restore each listing, so nothing reappears unreviewed.
- **Staff screen:** `GET /admin/moderation/catalog` returns live and suspended listings and verified and suspended providers; the staff page shows them under "Published listings & providers".
- **Instant navigation (Cache Components):** listing, session, apply and application pages now read the URL id and fetch their data inside `<Suspense>` with a skeleton, which removes the dev "1 issue" warning and lets the shell render immediately. Metadata still fetches the listing title per request.
- **Accessibility pass:** axe (WCAG 2.1 A/AA + best practice) on every main route; fixed a low-contrast badge tone and footer label, made the stories carousel keyboard-scrollable, added hidden section headings to keep heading order, and replaced sidebars nested in `<main>` (`aside`) with plain containers. All colour tokens were checked at 4.5:1 or better in both themes.
- **Deployment proxy:** when `API_ORIGIN` is set, `next.config.ts` forwards `/api/*` to the API, so the deployed browser only talks to the web domain and the session cookie is first-party (Vercel and Render are different sites). Set `NEXT_PUBLIC_API_BASE_URL` to the web app's own URL. See `docs/RUNBOOK.md`.
- **Tests:** the "assistant off" test pins `ai_enabled=False`, so a local `.env` with `AI_ENABLED=true` no longer breaks it.

### D25 — One sign-in page, confirmations, profile pictures, footer
**Status:** Adopted (2026-10-16, owner feedback before the hackathon pitch)
- **One sign-in page (`/sign-in`)** replaces the three separate sign-in boxes on `/account`, `/providers` and `/admin`. Pages that need an account send visitors there with `?next=<this page>`. After signing in we show a "You're signed in" message and go to `next` (same-site paths only, so a crafted link can't redirect elsewhere), or to the account's home: staff → `/admin`, providers → `/providers`, applicants → `/account`. Signing out shows "You're signed out" and goes home. Before this, sign-in swapped the page in place with no message and left the page scrolled, so it looked as if nothing had happened.
- **Messages** use Sonner (a small toast library) themed to the brand; they are announced to screen readers.
- **Demo accounts** are one-tap buttons on the sign-in page (development only, needs `DEV_AUTH_ENABLED=true`).
- **Profile pictures:** `PUT/GET/DELETE /api/v1/me/avatar`. Only JPEG, PNG and WebP up to 5 MB are accepted; the server re-encodes every upload into a 256 px square WebP (about 2–30 KB), which also removes metadata such as GPS location. Pictures are private (only the owner can fetch theirs) and stored in the database (`user_avatars`), because the demo host's disk is wiped on deploy and object storage is deferred. `UserPublic.avatar_url` carries a version so browsers refetch after a change. Upload and removal are audited.
- **Footer:** "© <year> Awgu StepForward. All rights reserved." The year is computed in a component cached for a day (Cache Components won't prerender a bare `new Date()`).

### D26 — Real emailed sign-in codes and a demo-mode switch
**Status:** Adopted (2026-10-21, before the hackathon pitch)
- **Delivery:** `EMAIL_PROVIDER=brevo|resend` sends email through the provider's HTTPS API (`app/integrations/messaging.py`); `console` still only logs. HTTPS rather than SMTP because Render's free plan blocks outgoing SMTP ports. Settings: `EMAIL_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`. Brevo is the suggested start (300/day free); Resend needs a verified domain to reach anyone but the account owner.
- **Codes:** when email delivers, the code is emailed and **never** returned to the browser. The email keeps the code out of the subject line (shared-phone lock screens) and reminds people that StepForward never charges to apply. If sending fails, the challenge is deleted (so the 60 s cooldown doesn't block a retry) and the API answers 503 `email_send_failed`.
- **Demo mode** is `DEV_AUTH_ENABLED`. On: one-tap sample accounts, and the code is shown on screen (labelled "no message was sent") only when the channel can't deliver. Off: no sample accounts, and channels that can't deliver are refused (`email_unavailable` / `phone_unavailable`). `GET /api/v1/auth/config` tells the sign-in page which options to show.
- **Phone:** SMS stays console-only (Termii needs a funded account and a registered sender ID), so phone sign-in appears only in demo mode.
- Email reminders use the same adapter, so they are delivered too once a provider is configured.

### D27 — Scheduled jobs and keep-awake via GitHub Actions
**Status:** Adopted (2026-10-21)
- **Problem:** reminders and listing expiry only ran by hand, and the free Render API sleeps after 15 minutes idle (about 50 s to wake, which would hurt a live pitch).
- **Decision:** `POST /api/v1/internal/jobs/run` runs expiry then reminders and returns the counts. It is protected by a shared secret (`JOBS_TOKEN`, sent as a bearer token and compared in constant time); with no token set it answers 404. Each run is audited (`job.scheduled_run`). A GitHub Actions workflow (`.github/workflows/scheduled-jobs.yml`) calls it hourly, retrying while a sleeping API wakes, and, when the repo variable `KEEP_AWAKE` is `true`, pings `/healthz` every 10 minutes.
- **Why not a worker or in-process scheduler:** free hosting has no background worker, and an in-process scheduler would stop whenever the API sleeps. The repo is public, so Actions minutes are free. Runs are idempotent, so a late or doubled run does no harm.
- **Later:** move to a real scheduler (Render cron job or a worker) when on paid hosting; TRD §8 still says one scheduler, not one per API replica.

### D28 — Restore support sessions
**Status:** Adopted (2026-10-21)
- Staff can **restore** a suspended support session (reason required; only while it hasn't ended and its provider is verified). Audited as `session.restored`; any other state returns 409.
- The staff card is now "Published listings, sessions & providers": a Sessions tab lists upcoming approved sessions (Suspend) and suspended ones (Restore). `GET /admin/moderation/catalog` adds `live_sessions` and `suspended_sessions`.
- The card treats a missing list as empty, because during a deploy the web app (Vercel) can briefly run against an older API (Render) that doesn't return it yet.
- With this, every R20 transition is available for listings, sessions and providers.

### D29 — Claude-backed opportunity assistant (replaces the rules-only engine when connected)
**Status:** Adopted (2026-10-21, before the hackathon pitch). Supersedes the "no external model" part of D6/D22.
- **Engine:** `ASSISTANT_ENGINE=claude` + `ANTHROPIC_API_KEY` makes the assistant call Claude (`claude-opus-5-5`, `ASSISTANT_MODEL`) through the official Anthropic Python SDK. Claude returns `category`, `location`, `delivery_mode`, `keyword` and a short explanation as **structured JSON** (`output_config.format` with a JSON schema whose enums match the directory's allow-lists), at `effort: low` for speed and cost.
- **Same guardrails as before (R46–R48):** redaction runs before the request leaves the server; the query is never stored (`AIUsageEvent` keeps filters, listing ids, engine, timing, outcome); the model never sees listings or people and only picks filters; every returned value is re-validated (unknown category/mode dropped, location and keyword must be plain words). The system prompt tells the model to treat the request as data, not instructions.
- **Always works:** any failure (no key, bad key, rate limit, 8 s timeout, network, refusal, non-JSON) falls back to the rule-based interpreter; the response says `fell_back: true` and the page tells the user. Server-side refusal fallbacks (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`) are enabled, so a safety decline is retried on a suitable model first.
- **Honest labelling:** each answer shows "Understood by Claude (AI)" or "simple keyword rules".
- **Not done:** an evaluation set to measure Claude vs rules on real Awgu phrasings (including Nigerian English and Igbo words), and a formal data-processing review before real users.

### D30 — Installable web app (PWA) and a fuller, self-refreshing demo
**Status:** Adopted (2026-10-21)
- **Install instead of a native app:** `app/manifest.ts` (name, theme colours, maskable and Apple icons, shortcuts) makes the site installable on Android and desktop; iPhone users add it via Share → Add to Home Screen. This answers "where is the mobile app?" without a second codebase (the Expo app stays deferred, D13).
- **Service worker (`public/sw.js`), deliberately small:** navigations are network-first with an offline page; fingerprinted `/_next/static`, `/images` and `/icons` files are cached after first use; `/api` and all private data are never cached (shared phones; listings must be current). Served with `Cache-Control: no-store` so updates reach phones. Registered in production builds only.
- **Install button:** uses `beforeinstallprompt` where available (Chrome/Edge/Android) and shows the Share → Add to Home Screen hint on iOS; hidden once installed. Next.js's guide cautions that the prompt API isn't cross-browser, hence the iOS fallback text.
- **Demo data:** 8 providers, 20 listings across all categories and 7 towns, 4 sessions. Seeding is idempotent and now refreshes passed deadlines and finished sessions of demo items (never staff-suspended ones), so the deployed demo doesn't decay before the pitch.

### D31 — Pitch data: real announcements, a featured slot and a photo per listing
**Status:** Adopted (2026-10-22)
- **More data, honestly labelled:** 61 listings (58 open, 2 waiting for review so moderation can be shown, 1 expired) and 8 sessions. 51 come from fictional demo providers. 9 are real programmes (NELFUND, Female Scholars Foundation, 3MTT, NiYA and five Enugu MSME & Startup Agency programmes) copied from their official pages on 2026-10-22. Programmes whose 2026 window could not be confirmed on an official page (MTN, Agbami, NLNG, Dangote, Jim Ovia) were left out.
- **`source_url` on listings:** set on copied listings. The site then shows "Public announcement" instead of "Verified", explains that the team has not verified it with the provider, and links to the original. Those organisations stay `pending` and have no provider account, because no one at them has signed up. Staff (the seeded admin) own the listings.
- **`is_featured` on listings:** staff-pinned listings rank first in the default sort, so they lead the home page. Seed-only for now; there is no admin control yet.
- **`image_url` on listings:** a photo under `/images/listings/` per listing; anything else falls back to the category picture, so a provider can't point the site at an unknown host. Photos are Pexels stock, cropped by `apps/web/scripts/fetch-photos.mjs`, and favour Nigerian and West African scenes.
- **HackathonAfrica 4.0 (featured):** a sample listing prepared for AfricaPlan Foundation, who run HackathonAfrica, following their cohort 3.0 call and using their own banner photo. Cohort 4.0 has not been announced; the listing says so and gives about July 2027 as the planned start. AfricaPlan is shown as verified because the team knows them directly. Get their written OK before the listing or photo is used beyond the pitch.
- **Minimum wage:** every full-time demo job pays at least N70,000 a month, Nigeria's national minimum wage.
- **Tests never send real email:** `tests/conftest.py` forces the console email and SMS adapters, whatever `backend/.env` says.

