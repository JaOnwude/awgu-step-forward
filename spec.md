# Awgu StepForward — Youth Skills and Opportunity Directory

**Document status:** Draft for product review  
**App name:** Awgu StepForward  
**Pilot area:** Enugu State, with Awgu LGA prioritized  
**Target clients:** Web/PWA and Android  
**Backend:** FastAPI

## Summary

Build a low-bandwidth opportunity platform that helps people across Enugu State, with Awgu prioritized, discover verified training, apprenticeships, scholarships, entry-level jobs, and paid local work such as day labor. Applicants can apply inside the platform or on an external provider site, track progress, and find application-support sessions. Verified organizations may submit opportunities, but an administrator must approve each listing before publication. The platform reports outcomes as self-reported or provider-confirmed and never promises admission, funding, training, or employment.

This is a verified opportunity and local-work marketplace with private professional profiles. It is not a social media platform: it has no public feed, open friend/follower graph, or direct messaging. It provides transparent filters, manual verification, offline drafts, and clear status history. It must work for users under and over 18 through age-aware account and safeguarding controls. It is not a job-placement agency, credential issuer, lender, or payment processor.

## Problem and goals

### Problem

Opportunity information is often spread across social posts, flyers, institutions, and personal networks. People may miss deadlines, struggle to establish whether a listing is legitimate, or lack help preparing an application. Providers and mentors also need a practical way to share opportunities and support sessions with prospective applicants.

These are product hypotheses for Awgu, not verified claims about every community. Before pilot launch, interview young people, caregivers, schools, training providers, employers, small businesses, and local organizations to confirm the information channels, opportunity types, access constraints, and safeguarding expectations.

### Goals

- Help users find current, relevant opportunities with clear eligibility, costs/pay, location, delivery mode, deadline, and provider verification status.
- Let approved providers submit listings and let platform staff review, approve, reject, suspend, and expire them.
- Support both in-platform applications and external application links, with a consistent applicant tracker.
- Make browsing, saving, and drafting useful when connectivity is intermittent; sync changes safely when a connection returns.
- Offer opt-in deadline reminders and application-support sessions using accessible, low-bandwidth channels.
- Include local paid gigs and short-term work, including construction labor opportunities for adults, with clear pay, worksite, task, and safety details.
- Provide bounded AI assistance for finding and understanding verified opportunities without automated eligibility or hiring decisions.
- Protect applicants, especially minors, through age-based privacy, guardian safeguards, provider vetting, reporting, and data minimization.
- Give operators measurable information about listing freshness, applicant activity, support session participation, and outcomes without overstating impact.

### Non-goals for the first release

- Guaranteeing a job, scholarship, admission, apprenticeship, or training placement.
- Ranking people with opaque or automated employability scores, predicting success, or making eligibility decisions on an applicant’s behalf.
- Public youth profiles, direct messaging between providers/mentors and youth, or open social feeds.
- Collecting application fees, holding money, lending, or processing scholarships/payments.
- Issuing qualifications, accrediting training providers, or claiming government endorsement.
- Automatically verifying identity, academic credentials, criminal records, or employment history.
- Replacing official application portals, school counselors, caregivers, or professional safeguarding services.
- Expanding outside Enugu State before the pilot establishes reliable provider verification and moderation.

## Users and permissions

| Role | Main capabilities | Data access boundary |
|---|---|---|
| Visitor | Browse and filter public listings, read provider information, report a suspicious listing | Public information only; no applicant data |
| Applicant, under 18 | Browse, save, create age-appropriate profile, apply to eligible listings, track status, register for support sessions | Own data; guardian-linked controls apply; no public contact/profile |
| Applicant, 18 or older | Browse, save, create profile, apply, track status, register for support sessions | Own data; shares application data only through an explicit application action |
| Guardian | Complete/confirm required consent, manage linked minor account settings, review consent and privacy notices | Only linked minor data and actions explicitly allowed by the safeguarding policy |
| Provider member | Maintain organization profile, submit/edit drafts, manage approved listings, review applications for their organization | Only records for their organization; applicant data only for applications submitted to that provider |
| Mentor/session organizer | Submit an application-support session proposal, manage approved sessions and attendance | Registration data only for sessions they organize; no unrestricted applicant profile access |
| Administrator | Verify organizations, review listings and reports, respond to support cases, suspend or expire content | Minimum information needed for assigned work; all sensitive access audited |
| Super-administrator | Manage admin roles and permissions, oversee queues/SLAs, handle escalations and sensitive overrides, review audit reports | Privileged access is restricted, strongly authenticated, and audited |

Role assignments must be enforced by the API on every protected request. Hiding a control in a client is not authorization.

## Product decisions and assumptions

The following reflect the choices made during initial brainstorming. Assumptions are implementation defaults until the owner approves or changes them.

1. **Age coverage:** all ages may use the service, with age-based controls. A user under 18 is treated as a minor. A user under 13 may browse public information and use guardian-assisted or organization-assisted access; the MVP does not provide an independent under-13 account. Accounts for ages 13–17 require guardian-linked safeguards before profile creation, applications, or support-session registration. Exact consent and age-verification procedures require Nigerian privacy/safeguarding review before real applicant data is collected.
2. **Application routes:** support both platform-managed forms and external provider application links. External submissions are not automatically visible to the directory; the applicant can mark progress manually.
3. **Provider publication:** providers request an account, administrators verify the organization, provider members submit listing drafts, and an administrator approves each listing before it becomes public. The super-administrator oversees decisions and escalations.
4. **Clients:** deliver a public web experience/PWA and an Android app. The web experience also contains provider and staff workspaces. The Android app is applicant-focused for the pilot.
5. **Pilot geography:** opportunities may be listed across Enugu State, with Awgu prioritized in default discovery, outreach, and pilot metrics. Each listing must state its location and service area.
6. **Languages:** English is the launch language. Keep text and notification content localizable; add Igbo translations only after qualified review.
7. **No applicant fees:** listings may describe legitimate tuition or program costs, but must not charge an application fee to access or submit an opportunity through this platform. Cost, stipend, and funding details must be explicit.
8. **Local gigs:** support short-term paid work and day labor in addition to formal jobs and training. By platform policy, construction-site labor listings are restricted to verified workers aged 18 or older until qualified Nigerian labor/safeguarding review approves any narrower exception. No under-18 applicant may be matched to hazardous work.
9. **Moderation target:** routine provider/listing/report initial review is targeted within 48 hours. Critical safeguarding and credible fraud reports receive same-day triage during published moderator coverage. The super-administrator monitors queue age and coverage.
10. **Messaging:** applicants choose phone or email verification. Recommendation: Brevo for transactional email and Termii for Nigeria-focused SMS OTP/alerts, behind replaceable provider adapters. See Messaging provider recommendation.
11. **AI:** include opt-in natural-language opportunity search and a staff/provider listing-quality assistant. AI may summarize approved listing information and suggest missing fields; it cannot approve listings, rank applicants, determine eligibility, or submit applications. Personal-data application coaching is deferred until privacy/safeguarding review approves it.
12. **Brand and design:** the visual system is original and tokenized. Use the references in Visual direction and design references as bounded inspiration, never as assets or templates to copy.

### Product identity: opportunity service, not social network

This is a verified local opportunity directory and application-management service. It is not a LinkedIn clone or open social-media platform. There is no public youth profile feed, follower graph, likes, or unrestricted direct messaging. Private applicant profiles support applications only; an applicant decides what information is sent with each in-platform application. Local employers may publish paid work and day-labor opportunities, including construction work, subject to the additional age, employer-verification, task, pay, supervision, and safety rules below.

## Core user journeys

### 1. Discover and evaluate an opportunity

1. Visitor/applicant browses by category, location, deadline, delivery mode, education level, and cost/stipend status.
2. Listing detail displays the provider’s verification status and verification date, eligibility, required documents, costs, stipend/funding, application route, deadline and time zone, contact method, and last-updated date.
3. Applicant saves a listing or shares/prints it. A listing nearing expiry is visibly labeled.
4. Applicant can report inaccurate, expired, discriminatory, suspicious, or fee-seeking content.

### 2. Create an age-aware applicant account

1. User provides a phone number or email and confirms control through a one-time code or equivalent account verification.
2. User states date of birth or approved age band. The system stores only the minimum age data needed to apply eligibility and safeguarding rules; exact birth date is private and never shown to providers by default.
3. For a minor, the user enters a guardian contact and the service records guardian consent/verification before enabling restricted profile/application features. A guardian can view the linked account relationship and revoke consent.
4. User accepts the privacy notice and selects notification preferences separately from service consent.
5. User creates a private profile with preferred name, community/LGA, education level, interests, skills, optional experience, and optional CV/portfolio. Profile fields are not public.

The precise age-check and guardian-consent mechanism is a launch gate. Do not request a government identity document by default. A qualified Nigerian privacy professional must review the account flow and lawful basis before pilot data collection.

### 3. Submit and review an organization and opportunity

1. A provider requests access with legal/common name (or individual employer name), provider type, public contact, operating location, representative, and verification evidence appropriate to the provider. Eligible provider types include registered organizations, schools, training providers, NGOs, public programs, SMEs, independent employers, and household project owners hiring workers.
2. Reviewer checks existence, contact control, references or registration where available, reputation/safeguarding details appropriate to the opportunity, and records evidence, decision, reviewer, and date. Community/household employers may use alternate evidence; organization registration is not mandatory where it does not apply.
3. Approved provider member creates a listing draft with structured fields and either a platform application form or external URL.
4. Reviewer checks completeness, safety, eligibility clarity, cost/pay disclosure, deadline, contact route, employer identity, and scam indicators. For local work, prefer an in-platform interest/application flow or privacy-protective contact relay; do not expose a minor’s phone number or home location to an employer.
5. Approved listing becomes searchable. Provider may edit it; material edits return it to review. Listing expires automatically at its deadline unless the provider requests an extension and a reviewer approves it.
6. Reviewer may suspend a provider or listing immediately when a credible safety or fraud concern is reported; the system preserves an audit record and notifies affected users where appropriate.

### 4. Apply inside the platform

1. Applicant reviews requirements, privacy notice, and which profile fields/files will be sent to the provider.
2. Applicant completes the provider-defined form and attaches optional documents only when the opportunity requires them.
3. The client validates required fields, file type/size, and deadline. Drafts can be saved offline; final submission requires connectivity and a final confirmation.
4. Server creates a unique application and sends a submission receipt. Repeated taps or network retries must not create duplicate submissions.
5. Provider member reviews submitted applications and may update status with a note visible to the applicant. Applicants can withdraw where the provider workflow allows it.
6. Applicant can request correction/deletion through account privacy controls, subject to a documented lawful retention requirement.

### 5. Apply externally and track progress

1. Applicant opens the verified provider’s application URL or views instructions/contact details.
2. The platform records an “external application started” action only after the applicant chooses it.
3. Applicant may manually mark submitted, interview, offered, accepted, rejected, withdrawn, or completed and may record a private note.
4. External status is labeled applicant-reported; it is not presented as provider-confirmed.

### 6. Application-support sessions and outcomes

An application-support session is the group workshop/help desk defined above. It helps participants prepare materials or understand application steps that may be difficult to complete alone.

1. Approved mentor/partner submits a session with topic, date, location or remote method, capacity, accessibility notes, age suitability, and organizer contact.
2. Staff review and publish. Applicant registers; minors follow the session-specific consent/safeguarding rules.
3. Organizer sees only necessary registration details, records attendance, and can share approved follow-up resources.
4. Applicant may optionally report interview, acceptance, training completion, or job placement. Provider-confirmed outcomes are separately labeled and require appropriate applicant consent.

## Functional requirements

Priority: **Must** means required for the pilot; **Should** means include if it does not delay core safety and workflow; **Later** means explicitly outside the pilot unless re-approved.

### Discovery and listings

- **R1 (Must):** The public directory shall support opportunity types: training, apprenticeship, scholarship/funding, entry-level employment and SME vacancies, paid local gig/day work, and short-term labor contracts.
- **R2 (Must):** Each listing shall include title, description, provider/employer, opportunity type, location/community, delivery mode, eligibility/minimum age, required documents, costs/pay/stipend/funding details, application route, opening/deadline dates, contact route, status, verification state, and last-updated time. Work listings must also state task/scope, expected hours or dates, payment terms, named supervisor/contact, and safety/PPE requirements. Unknown values must be labeled as unknown rather than implied to be free or available.
- **R3 (Must):** Visitors shall filter by type, LGA/community, age/education eligibility, deadline, delivery mode, and cost/stipend. Results must explain active filters and have a deterministic sort (deadline soonest, newest, or relevance by selected filters).
- **R4 (Must):** Listing details shall display the provider verification date, listing review date, expiry date, and a report action.
- **R5 (Must):** The system shall automatically mark listings past deadline as expired, remove them from default active search, and retain history for applicants and audit.
- **R6 (Must):** Applicant shall be able to save/bookmark listings and view them offline after synchronization.
- **R7 (Should):** The system shall provide a public printable/shareable opportunity summary that omits private applicant information.

### Accounts, profiles, and age controls

- **R8 (Must):** Users shall be able to browse public listings without creating an account.
- **R9 (Must):** Applicant registration shall support phone or email verification and protect against repeated OTP abuse.
- **R10 (Must):** The system shall classify accounts into configurable age bands and apply server-side permissions for minors.
- **R11 (Must):** For an account classified as a minor, the system shall block profile/application/support session features until the required guardian consent workflow is complete; it shall retain consent method, timestamp, policy version, guardian relationship, and revocation status without storing unnecessary identity documents.
- **R12 (Must):** Applicant profiles shall be private by default. Providers shall receive profile data only when the applicant submits an application and consents to the displayed data sharing.
- **R13 (Must):** Applicants shall be able to view, edit, export, and request deletion of their profile and uploaded files. The system shall explain any records that must be retained and for how long.
- **R14 (Must):** The MVP shall not expose precise home coordinates, public phone numbers, public CVs, or public applicant profiles.
- **R15 (Should):** Applicants can create a simple skills/experience summary and optional portfolio/CV; profile completeness shall be descriptive, not an employability score.

### Provider trust and moderation

- **R16 (Must):** An organization, SME, independent employer, or household project owner shall submit a provider access request and appropriate verification evidence through a private workflow. Verification criteria must fit the provider type; do not require organization registration from an individual employer when it does not apply.
- **R17 (Must):** Only staff can mark an organization as verified. The decision shall record reviewer, date, status, evidence type, expiration/recheck date, and reason.
- **R18 (Must):** Verified providers can create/edit drafts. Every new listing requires staff approval before publication.
- **R19 (Must):** Material edits to cost, deadline, eligibility, provider, application route, or age suitability shall return the listing to review.
- **R20 (Must):** Staff shall be able to approve, reject with reason, request changes, suspend, restore, and expire providers/listings. All transitions are audited.
- **R21 (Must):** The system shall provide a report queue for suspected fraud, fee solicitation, harassment, discrimination, inaccurate listings, and expired opportunities.
- **R22 (Must):** Opportunity listing rules shall prohibit applicant application fees and misleading guarantees of employment, admission, funding, or certification. Program tuition or other legitimate participation costs must be clearly disclosed and reviewed.
- **R22a (Must):** Administrators shall use a risk-based checklist for work listings. Construction-site labor must be restricted to verified adults (18+) unless a qualified Nigerian legal and safeguarding review approves a narrower age-appropriate exception. Listings must state task, pay, work location, expected hours, supervisor, and safety arrangements; vague “labor wanted” posts cannot be published. Employers must verify identity and a reachable contact through a private staff workflow. No public applicant contact or precise home coordinates.
- **R22b (Must):** The platform shall not facilitate under-18 work that is hazardous, interferes with schooling, or otherwise fails the approved child-safeguarding rules. Age and opportunity constraints are enforced by the API, not only by search filters.
- **R23 (Should):** Provider verification shall support organization registration documents when available, but shall not require a specific document type when a credible community institution cannot obtain it; reviewers must record alternate evidence and rationale.

### Applications and outcomes

- **R24 (Must):** A provider may configure a limited set of application questions using supported safe field types: short/long text, single/multi-select, yes/no, date, and optional file upload.
- **R25 (Must):** Applicants shall see a review screen listing every answer and file that will be shared before submission.
- **R26 (Must):** In-platform submission shall be idempotent and produce a timestamped receipt and application reference.
- **R27 (Must):** Applicants shall see application status and status history. Each status change shall identify whether it came from the applicant, provider, or staff.
- **R28 (Must):** The system shall support applicant-reported external applications and clearly label those statuses as unverified.
- **R29 (Must):** Provider members shall only view applications submitted to their own organization and shall not export applicant documents in bulk in the MVP.
- **R30 (Must):** Statuses shall distinguish application progress from outcomes. Minimum progress states: draft, submitted, under review, interview, offered, accepted, rejected, withdrawn, and closed. Outcome states shall separately represent training started/completed, scholarship awarded, apprenticeship started/completed, employment started/completed, and paid gig completed; source must be applicant-reported or provider-confirmed.
- **R31 (Must):** The system shall not infer successful placement from an application being offered or accepted.
- **R32 (Should):** Providers may send a status note using moderated templates; direct messaging is out of scope.

### Application-support sessions and notifications

- **R33 (Must):** Approved organizers shall be able to submit support sessions; staff approval is required before public listing.
- **R34 (Must):** Applicants shall be able to register/cancel, see capacity and accessibility details, and receive a reminder if they opt in.
- **R35 (Must):** Notifications shall support in-app, email, and SMS where the user has a verified destination and has selected that channel. Users choose phone or email for account verification and may set a separate reminder preference. Channel preference and service/marketing consent shall be separate; email and SMS providers sit behind replaceable adapters.
- **R36 (Must):** Deadline reminders shall be configurable and deduplicated. Failed deliveries shall be recorded without blocking account or application flows.
- **R37 (Must):** Notification content for minors shall avoid exposing sensitive profile or application details on shared devices.
- **R38 (Should):** The service shall provide a printable support session roster that hides unnecessary applicant information and requires organizer authorization.

### Offline, accessibility, and operations

- **R39 (Must):** Web/PWA and Android clients shall cache public listings and saved opportunities and support offline profile/application drafts.
- **R40 (Must):** Offline application drafts shall display sync state and last-synced time. The client shall preserve user edits across restart and present conflicts for user resolution rather than silently overwriting data.
- **R41 (Must):** Final submission, provider verification, moderation, and status changes require an online server acknowledgment.
- **R42 (Must):** The interfaces shall support keyboard navigation, readable contrast, scalable text, labeled controls, screen-reader names, and accessible validation errors.
- **R43 (Must):** Admin reports shall distinguish counts from unique people, self-reported outcomes from provider-confirmed outcomes, and active from expired listings.
- **R44 (Must):** The service shall provide an audit log for privileged access, provider verification, listing transitions, consent changes, application access, file download, and outcome confirmation.
- **R45 (Must):** Staff queues shall show age, owner, priority, and overdue state. Routine provider/listing/report cases target an initial decision or status update within 48 hours. Credible child-safety, violence, exploitation, or active fraud reports require same-day triage within the published staffed coverage window, with immediate suspension available to authorized staff.
- **R46 (Must):** An opt-in AI opportunity navigator may translate a user’s plain-language request into filters and summarize only approved, current listing fields. It must show the source opportunity, explain which fields informed the suggestion, and provide ordinary filters/search as a complete fallback. It shall not invent listings, determine eligibility, promise outcomes, rank people, or make hiring/admission decisions.
- **R47 (Should):** A provider/staff AI listing assistant may draft or improve listing text, identify missing required fields, and flag potentially unclear or risky wording. It must use a human review step; it cannot verify a provider, approve/publish/suspend a listing, or contact applicants.
- **R48 (Must):** AI features shall not receive applicant profiles, CVs, application answers, guardian details, or uploaded documents in the MVP. Warn users not to include personal information in free-text AI queries and redact detected contact/identity details before sending a query to an external model. Do not retain raw prompts. Log feature/model/version and outcome metadata with minimized or redacted inputs. AI can be disabled by feature flag, and non-AI flows must remain usable.
- **R49 (Must):** Web/PWA and Android screens that wait for route or data loading shall show content-shaped skeleton placeholders for the affected region while preserving the shared app shell where possible. Skeletons must reserve expected layout space, be visually distinct from real content, and not present placeholder text as real opportunity or applicant data.
- **R50 (Must):** Loading states shall be distinct from empty, error, offline, and permission-denied states. Each state shall provide an appropriate next action where applicable; failed requests must not leave an indefinite skeleton.
- **R51 (Must):** Skeletons shall use subtle motion only, respect reduced-motion settings, and expose an accessible loading status while hiding decorative placeholder shapes from screen readers. Avoid flashing skeletons for requests that complete immediately; stale usable data may remain visible during background refresh.
- **R52 (Must):** Web/PWA and Android users shall be able to choose System, Light, or Dark appearance. System follows the device/browser preference. The explicit choice is persisted on that device and applied consistently across routes and app restarts; it must not change data visibility or authorization. A later account-level cross-device preference may be added only if it does not delay the pilot.
- **R53 (Must):** Both appearance modes shall use the same semantic design tokens and meet the accessibility contrast requirements in R42. Status, verification, eligibility, and moderation states must remain understandable without relying on color alone. The UI must avoid a flash of the wrong theme during web startup where technically supported.
- **R54 (Must):** The service shall include repeatable performance tests for important API endpoints and representative end-to-end user flows. Tests shall define workload, environment, duration, pass/fail thresholds, and report p50/p95/p99 latency, throughput, failure rate, and relevant resource/database saturation metrics. Test data must be synthetic or approved, and stress tests must run in an isolated staging environment rather than against production.
- **R55 (Must):** Capacity testing shall ramp through 100, 250, 500, and 1,000 concurrent virtual users using realistic pauses and a representative workflow mix, and shall separately ramp request rate to identify endpoint throughput and the saturation point. These are benchmark stages, not a claim of supported capacity. The reported supported capacity is the highest tested load that meets the agreed service targets, with deployment configuration and bottlenecks documented.
- **R56 (Must):** Load-test acceptance targets shall initially be API read p95 under 700 ms, critical write p95 under 1 second, and fewer than 1% failed requests at the target load. Record p99 and identify slow or saturated dependencies even when the threshold passes. Targets may be revised only with an explicit rationale and recorded baseline; exclude external provider latency and file transfer from API timing while measuring them separately.
- **R57 (Must):** The production topology shall support a managed load balancer/reverse proxy routing to multiple stateless FastAPI instances, with health/readiness checks, graceful instance removal, request timeouts, and documented scaling controls. The implementation shall not require Kubernetes or microservices for the pilot.
- **R58 (Must):** API instances shall use bounded database connection pools whose combined maximum fits the configured PostgreSQL connection budget with operational reserve. Load tests and monitoring shall include pool wait time, active connections, query latency, database CPU/memory, and queue depth. Add a connection pooler, cache, read replica, or additional worker capacity only when measurements justify it.
- **R59 (Must):** Slow or retryable side effects (including notifications, deadline jobs, file scanning, and optional AI calls) shall be isolated from interactive request paths using durable, observable background processing where appropriate. Retries must be bounded and idempotent; overload behavior must avoid unbounded queues and provide safe user-visible failure/retry states.

## Proposed solution and architecture

### Messaging provider recommendation

Use Brevo for transactional email during the pilot because its published free plan includes 300 email sends per day on an ongoing basis. Treat SMS as a metered channel: use a replaceable adapter and pilot Termii for Nigeria-focused OTP and alerts after confirming sender-ID approval, delivery, and current pricing. Brevo also supports Nigeria SMS, so it can be a fallback or a simpler single-vendor option if its SMS credit economics and delivery tests are better for the pilot. Do not use Zoho Mail for automated transactional mail; Zoho directs that use case to ZeptoMail. ZeptoMail’s published free allowance is a one-time 10,000 email credit valid for one month, so it is less suitable as a continuing free tier. Verify all pricing and country/sender requirements before launch.

### Visual direction and reference rules

Treat these references as separate inspiration sources. Do not copy source code, text, images, branding, or proprietary assets. The final product must be an original design adapted to its logo, content, identity, local context, and accessibility needs.

**Global styling — [Co.Lab](https://www.joincolab.io):** use as a starting point for overall styling, spacing and rhythm, whitespace, color balance and contrast, button proportions, typography hierarchy and density, navigation, page composition, premium editorial feel, section transitions, and visual pacing. Adapt values rather than reproducing exact ones.

**Application-support services page — [ThemeWagon Profusion Services](https://themewagon.github.io/Profusion/services.html):** use for page composition, service-card/section layouts, scroll behavior, reveal patterns, section transitions, interaction patterns, animation timing, and the way service content is introduced while scrolling. Do not use its colors or fonts; use this product’s own tokens.

**Other pages — [Co.Lab Partnerships Menu](https://www.joincolab.io/partnerships-menu):** use for page hierarchy, navigation and menus, content grouping, section spacing, editorial composition, responsive behavior, visual storytelling, and transitions. Prioritize clarity, usability, accessibility, and product-specific functionality whenever they call for a different adaptation.

**Additional inspiration:** [Dribbble](https://dribbble.com/) for visual concepts and component directions, validated against realistic flows; [Mobbin](https://mobbin.com/) for shipped mobile/web patterns; [Awwwards](https://www.awwwards.com/) and [Land-book](https://land-book.com/) for full-page composition and responsive storytelling; [Behance](https://www.behance.net/) for brand identity and product case studies. These are research references, not permission to copy. Avoid visual patterns whose motion or complexity is unsuitable for low-end phones and low-bandwidth users.

Centralize design values in a theme/design-token system: font families and weights; type sizes and line heights; colors; spacing scale; container widths; breakpoints; radii; borders; shadows; button variants; transition durations and easing; and animation preferences. Build reusable components for directory cards, filters, status/verification badges, forms, notices, and application steps. Motion must be subtle, purposeful, performant, reusable, and respect `prefers-reduced-motion`; provide equivalent reduced-motion behavior on Android. Use locally relevant photography only when rights and consent are clear; never use fabricated testimonials or imply government endorsement.

Design the landing page, directory and filters, opportunity detail (including pay, cost, verification, deadline, and safety), age-aware onboarding, application review/submit/status flow, provider listing workflow, staff moderation dashboard, and application-support session pages as one coherent system. Ensure Android and PWA share information hierarchy and tokens while respecting platform conventions.

For a copy-ready AI design brief, use the standalone [UI generation prompt](ui-generation-prompt.md). It is a prompt for generating an exhaustive design system and screen set, not authority to invent product behaviors that conflict with this specification.

### One-week delivery target

A one-week schedule is achievable for a usable, demonstrable web/PWA vertical slice if scope is locked and one developer/agent has a working environment, daily decisions, and prepared design/data. It is not realistic to deliver every production requirement in this document—including a separately released Android app, comprehensive minor safeguards, external-provider onboarding, full offline conflict resolution, real SMS, AI deployment, penetration review, and production operations—in seven days. Do not label an unreviewed demo as production-ready.

For a seven-day pilot prototype, prioritize in this order:

1. **Day 1 — repository and UI foundation:** monorepo with `backend/` managed by uv and a Bun workspace for `web/`, `mobile/`, and shared packages; FastAPI/Next.js skeletons; database; shared tokens; working local start command; seeded realistic listings.
2. **Day 2 — provider and moderation vertical slice:** provider draft submission, admin approve/reject, verification/status badges, audit event.
3. **Day 3 — public discovery:** responsive directory, filters, details, Awgu-first default ranking within Enugu listings, expired-state handling.
4. **Day 4 — applicant workflows:** account/profile for adults, save listing, external application tracking, in-platform scholarship form and submission receipt.
5. **Day 5 — local work and support:** verified employer listing with adult-only construction policy and required work terms; application-support session discovery/registration; staff queues.
6. **Day 6 — notifications and AI slice:** email adapter and mocked/test-mode SMS adapter; opt-in, grounded opportunity assistant behind a feature flag, with deterministic fallback and no applicant data sent to model.
7. **Day 7 — stabilization and demo:** run automated checks, fix highest-impact defects, keyboard/mobile review, seed a coherent demo, document known limits, and deploy a non-sensitive demo environment.

Keep Android as a separate follow-on release after the REST contract stabilizes; in week one, at most produce its scaffold and shared token/API-client plan. Real accounts for minors, real scholarship documents, live SMS to users, and production AI remain disabled until legal/safeguarding, security, and provider checks in this spec are complete. If Android delivery within the week is mandatory, reduce week-one web scope to the public directory and one application flow rather than pretending both clients can receive equal depth.

### Agent handoff assets that improve implementation speed

Before asking an implementation agent to build features, provide these repo-local assets:

- `AGENTS.md`: concise commands to install/run/lint/typecheck/check the backend and web app; repo map; feature-boundary rules; security/privacy invariants; definition of done; link to this spec. Keep it operational, not a duplicate of the full requirements.
- `IMPLEMENTATION_PLAN.md`: ordered, small vertical slices with named files/modules, dependencies, acceptance checks, and explicit “defer” items for the one-week target. Mark completed work so agents do not re-plan the whole project each turn.
- `docs/DESIGN_SYSTEM.md` plus Figma link/export: final tokens, component states, typography, responsive breakpoints, and chosen screens. Avoid asking the coding agent to infer details from inspiration websites alone.
- `docs/API_CONTRACT.md` or generated OpenAPI snapshot and TypeScript client: endpoint shapes, auth, errors, pagination, idempotency, and example requests/responses. This keeps independently built frontend/backend slices aligned.
- `.env.example`, Docker Compose, seed/demo data, and one-command local startup. Use `uv` commands for Python and `bun` commands for JavaScript/TypeScript; never document pip/npm/pnpm as project commands. Never commit real secrets or real applicant data.
- CI commands and a short `make`/task runner for migrations, format/lint, type checks, and focused tests. Make the same commands work locally and in CI.
- A short decision log for unsettled choices (auth approach, object store, SMS vendor, AI vendor). Agents should use the settled spec unless a decision is explicitly reopened; they should not invent credentials or silently add services.

Ask agents to implement one vertical slice at a time, inspect the existing repo before editing, preserve the spec’s safety limits, report changed files and commands run, and stop at external credentials or legal approvals instead of substituting fake production integrations.

### Backend

- **Runtime:** Python with FastAPI, Pydantic schemas, SQLAlchemy 2.x, Alembic migrations, and PostgreSQL. Use a modular monolith for the pilot; do not split into microservices.
- **Python tooling:** use `uv` for Python version/project dependency management, virtual environments, command execution, and lockfile generation. Commit `pyproject.toml` and `uv.lock`. Document `uv sync` and `uv run ...` commands. Do not use pip or a requirements.txt workflow as the project’s dependency-management source of truth.
- **Folder organization:** feature-based (vertical slices), not one global `routers/`, `models/`, `schemas/`, and `services/` directory. Each backend feature owns its API routes, schemas, service/use-case logic, persistence/repository code, and focused tests. Shared infrastructure contains configuration, database/session setup, security primitives, observability, and common errors only. Avoid circular imports and do not let one feature reach into another feature’s persistence internals; use explicit service interfaces.
- **Suggested backend layout:** `backend/app/main.py`; `backend/app/core/` (settings, security, logging, errors); `backend/app/db/` (session, base, migrations); `backend/app/features/{identity,applicants,guardians,providers,verification,opportunities,applications,sessions,notifications,moderation,files,reporting,ai,audit}/` (each with `router.py`, `schemas.py`, `service.py`, `models.py`, `repository.py` as needed); `backend/app/integrations/` (email, SMS, object storage, AI); `backend/tests/` mirroring feature boundaries. Keep `main.py` composition-only.
- **Modules:** identity/access, applicant profiles/consent, provider organizations, verification, opportunity catalog, applications, application-support sessions, notifications, moderation, files, reporting, AI adapters, and audit.
- **API:** versioned REST/JSON under `/api/v1`; publish OpenAPI; generate TypeScript clients for web and Android from the OpenAPI schema. Use consistent pagination, validation errors, timestamps in UTC, and idempotency keys for retryable writes.
- **Authentication:** verified phone or email sign-in. Use short-lived access tokens and rotating refresh tokens; store web credentials in secure, HttpOnly cookies and Android credentials in platform secure storage. Require stronger authentication for staff/provider accounts and support MFA for privileged roles.
- **Authorization:** role- and organization-scoped policies enforced in service/data access layers. Include automated tests for cross-organization and minor-account access boundaries.
- **Database:** PostgreSQL. Keep application status history, consent history, verification decisions, and audit events append-only or versioned. Use soft deletion only where retention policy requires a reversible state; otherwise support scheduled deletion.
- **Background work:** a durable task queue for OTP delivery, SMS/email, deadline reminders, file scanning, listing expiry, and deletion jobs. Each task must be retry-safe and observable. Redis may back the queue and rate limits.
- **File storage:** private S3-compatible object storage. Use short-lived signed uploads/downloads, per-file authorization, size/type limits, malware scanning, checksum, encryption, and retention/deletion jobs. Never make CVs or application files public.
- **Integrations:** replaceable SMS and email provider adapters; storage adapter; optional analytics export. No payment gateway, national identity lookup, or government-system integration in MVP.
- **Messaging providers:** implement provider interfaces and delivery receipts. Use Brevo for transactional email and evaluate Termii for SMS; support user-selected verified phone/email and record channel preference. Keep templates neutral for shared-device safety. Vendor secrets stay server-side.
- **AI:** isolate the opportunity navigator and listing assistant behind an AI service interface with strict input/output schemas, timeouts, rate limits, prompt/version tracking, and feature flags. Ground search/summaries in the approved-listing database and return listing IDs/field citations. Validate all AI output before display. Do not send applicant PII or files to an external model in MVP; disclose AI assistance and allow a deterministic search path.
- **Operations:** Docker-based local setup, separate development/staging/production configuration, secrets from environment/secret manager, database backups, migration checks, structured logs with PII redaction, metrics, error tracking, and documented restore procedure.

### Web and PWA

- **Framework:** Next.js App Router with TypeScript, Tailwind CSS, and shadcn/ui. Use the current stable versions selected at project scaffold time and commit the lockfile; do not pin this spec to a version number that can become stale.
- **JavaScript tooling:** use Bun for JavaScript runtime/package management, scripts, and workspace orchestration. Commit `package.json` and `bun.lock`; document `bun install`, `bun run <script>`, and `bunx` commands where appropriate. Do not use npm or pnpm as the project’s package-management workflow.
- **Workspace:** prefer a Bun workspace containing `web/`, `mobile/`, and shared TypeScript packages such as `packages/api-client`, `packages/domain`, and `packages/design-tokens`. Keep Python in `backend/` managed independently by uv; do not force Python into the JavaScript workspace.
- **Route and feature organization:** use the App Router for URL/layout composition, with route groups such as `(public)`, `(auth)`, `(applicant)`, `(provider)`, and `(staff)` where helpful. Put domain UI and data-access code under `src/features/{opportunities,applications,profile,providers,sessions,moderation,notifications}/`. Keep route files thin: parse params, compose layouts/pages, and delegate domain behavior to feature modules.
- **Suggested web layout:** `web/src/app/` (layouts, route groups, loading/error/not-found boundaries), `web/src/features/<feature>/{components,hooks,api,schemas,types}`, `web/src/components/ui/` (shadcn primitives), `web/src/components/shared/`, `web/src/lib/` (API client, auth, formatting, utilities), `web/src/styles/`, and `web/src/theme/` (design tokens). Avoid one giant `components/` directory and avoid duplicating API types by hand.
- **Server/client boundaries:** use Server Components for suitable public, SEO-friendly pages and initial read rendering. Add Client Components only for interactive regions. Keep secrets and privileged API calls on the server; never expose provider credentials or server-only FastAPI secrets to browser bundles.
- **Loading and appearance:** provide route-level `loading.tsx` fallbacks and nested loading boundaries for independently fetched regions. Build reusable, content-shaped skeleton primitives for listings, forms, dashboards, and tables; do not duplicate ad hoc skeleton markup. Keep the app shell stable, distinguish loading from empty/error/offline states, and retain stale data during background refresh where safe. Implement System/Light/Dark appearance through semantic theme tokens, persist the user’s explicit choice locally, prevent startup theme flash where feasible, and support reduced motion and accessible status announcements.
- **Data and UI state:** use TanStack Query for FastAPI-backed server state: fetching, caching, invalidation, mutation lifecycle, and retry behavior. It is not a general global state store. Use React state/reducer for local transient UI state; add a small client-state store only if a real cross-route client-state need appears. Do not mirror the same API data into multiple stores. If using SSR/hydration with TanStack Query, follow the current App Router SSR/hydration guidance and create request-safe query clients.
- **Forms and contracts:** use React Hook Form plus Zod (or an equally explicit schema approach) for client forms; keep server validation authoritative. Generate or derive TypeScript API types/client from FastAPI OpenAPI where practical. Treat generated files as generated; do not hand-edit them.
- **Styling/components:** use Tailwind utility classes and shadcn/ui primitives, customized through the centralized brand tokens. shadcn components are owned source files: adapt them consistently instead of layering a second component library. Use semantic HTML, visible focus, accessible names, keyboard support, and reduced-motion behavior.
- **Low-bandwidth behavior:** use responsive images, restrained fonts/assets, explicit loading/empty/error/offline states, cache only approved public data and user-owned drafts, and never cache sensitive attachments in a shared service-worker cache.
- **Implementation document bundle:** [docs/README.md](docs/README.md) indexes the SRS, TRD, ERD, and API contract guide for agent handoff. Keep frontend architecture and implementation details in [frontend-spec.md](frontend-spec.md), and page-by-page visual-generation prompts/reference-site instructions in [ui-generation-prompt.md](ui-generation-prompt.md). This product spec owns behavior, roles, safety, accessibility, theme, loading, and performance requirements; companion documents must remain consistent with it.

- Public responsive directory with search/filter, provider verification details, opportunity detail, application-support session calendar, and report action.
- Include a local paid-work board with clear pay, dates/hours, task, worksite area, supervisor/contact, and safety/PPE details; construction work shows a prominent adults-only notice and is hidden from ineligible accounts.
- AI-assisted natural-language search is an optional entry point that returns ordinary, verifiable opportunity cards and the filters used; keep standard browse/search visible.
- Applicant workspace for saved opportunities, profile, application drafts/submissions, status history, files, consent, and notification settings.
- Provider workspace for organization verification progress, listing drafts, approved listings, application review/status updates, and application-support session proposals.
- Staff workspace for provider verification, listing review, report queue, user support, policy configuration, audit search, and aggregate reports.
- Service worker caches only public listing data, static assets, and user-authorized drafts. Do not place sensitive documents in shared/browser caches.
- Localize content strings and date/currency formatting. Show deadlines in West Africa Time (WAT) and retain UTC timestamps in storage.

### Android app

- **Decision:** use React Native with Expo and Expo Router for the Android pilot. This aligns with the web team’s TypeScript/React skills and reduces tooling/context switching for a one-week delivery target. Reconsider Flutter only if the implementation team already has strong Dart/Flutter experience or a later product requirement demands a capability React Native cannot meet efficiently.
- Build native mobile screens with React Native primitives and accessible platform patterns. Do not try to reuse Next.js/shadcn DOM components in the app. Share the generated API client/types, domain validation schemas where compatible, localization strings, and brand token values from a small workspace package.
- Use TanStack Query for API-backed server state in the app too; keep transient screen state local. Define a mobile design-token adapter so shared brand values map cleanly to native styles.
- Use Expo Router for file-based navigation and deep links. Keep routes in `mobile/src/app/`; put feature components, hooks, API adapters, and native-only UI in `mobile/src/features/` and `mobile/src/components/`.
- Store public listings, saved items, and encrypted or platform-protected drafts locally. Avoid caching uploaded files after successful submission unless the user explicitly chooses to retain a local copy.
- Provide low-data images, offline indicators, retry queue, conflict screen, local reminders only when the user opts in, and accessible text scaling.
- Provide reusable native skeleton components for route and section loading, with distinct empty/error/offline states and reduced-motion behavior. Implement System/Light/Dark appearance using shared semantic brand tokens mapped to native styles; persist the explicit selection locally and maintain legible contrast in both modes.
- Version the local database and include migration/backup behavior for app upgrades.
- Do not require background location, contacts access, microphone, camera, or broad storage permissions. Request camera/file access only when applicant selects an attachment.

### Core data model

| Entity | Essential fields and relationships |
|---|---|
| User | id, verified phone/email, role memberships, account status, created/updated timestamps |
| ApplicantProfile | user id, preferred name, age band/minor flag, LGA/community, education level, interests, skills, optional experience; private by default |
| GuardianLink | minor user, guardian contact/account, verification method, consent scope/version/time, status, revocation time |
| Organization | name, type, public contact, operating area, verification status, review/recheck dates |
| ProviderMembership | organization, user, role, invitation/status, permissions |
| VerificationCase | organization, evidence references/types, reviewer, decision, rationale, timestamps, recheck date |
| Opportunity | organization, type, title, description, eligibility, costs/funding, location/mode, dates, application route, status, review history |
| WorkTerms | opportunity, task/scope, pay/rate and payment timing, hours/dates, worksite/community, supervisor, safety/PPE, minimum age, hazard review |
| ApplicationForm | opportunity, question schema, version, open/close state |
| Application | applicant, opportunity, route, status, status source/history, submission time, consent snapshot |
| ApplicationAnswer | application, form version, question key, answer value, access classification |
| FileAsset | owner, application/profile, storage key, MIME/size/checksum, scan state, expiry/deletion date |
| SavedOpportunity | applicant, opportunity, saved timestamp, sync metadata |
| ApplicationSupportSession | organizer, topic, age suitability, date/location/mode, capacity, accessibility, approval status |
| SessionRegistration | applicant, session, consent/guardian state, attendance status |
| Outcome | application/opportunity, type, source (applicant/provider), consent, confirmation time |
| Notification | recipient, channel, purpose, template/version, delivery state, scheduled/sent time |
| Report | reporter (optional), target, category, moderation state, decision history |
| AuditEvent | actor, action, target, timestamp, request context, redacted metadata |
| AIUsageEvent | feature, model/provider version, request ID, listing IDs used, latency, safety/validation outcome; no raw personal prompt text |

Do not add fields merely because they might be useful later. For each personal field, document purpose, visibility, lawful basis, retention, and deletion behavior.

### Initial API surface

The final endpoint naming can follow the repository’s conventions, but the implementation must provide equivalent operations:

- Public: `GET /opportunities`, `GET /opportunities/{id}`, `GET /providers/{id}`, `GET /application-support-sessions`, `POST /reports`.
- AI (opt-in): `POST /opportunity-assistant/search` with non-sensitive query text and filters; response contains listing IDs, structured filters, short grounded explanation, and source fields. `POST /provider-assistant/draft-review` is authenticated and restricted to authorized provider/staff draft content.
- Identity and applicant: registration/verification, profile read/update/export/delete request, guardian consent/link management, saved opportunities, notification preferences.
- Applications: form retrieval, draft create/update, file upload initialization/completion, submission, external-application start, status list, withdrawal, outcome report.
- Provider: organization request, verification status, member invitations, opportunity draft CRUD, listing submission, application list/detail/status update scoped to that organization, application-support session proposal.
- Staff: verification queue/decision, listing review/decision/suspension, report moderation, application-support session approval, user support actions, audit search, aggregate metrics, moderation SLA queue.
- Operations: health/readiness endpoints that disclose no secrets or personal data.

All list endpoints require pagination and bounded filters. Provider/application endpoints must reject cross-tenant identifiers even if guessed. File download must re-check current authorization and consent.

## Privacy, safeguarding, and trust requirements

- Before the pilot collects personal data, complete a privacy impact assessment and have qualified Nigerian privacy/safeguarding reviewers approve lawful bases, minor consent/age assurance, retention, provider agreements, and incident handling.
- Apply age controls server-side. For under-18 users, use guardian-linked safeguards before enabling account features that process profile/application information. Define a supported alternative when a user cannot safely provide a guardian contact; do not silently bypass the safeguard.
- Do not ask for government ID as the default age-verification method. Record the minimum evidence needed to show the approved consent process was completed; protect and delete any evidence used for verification according to policy.
- No public applicant profiles, location pins, public CVs, personal phone numbers, or direct youth-provider/mentor messaging.
- Provider access to personal application data starts only after the applicant submits to that provider and sees a data-sharing summary. Access ends when no longer needed under the approved retention policy.
- Separate essential service notifications from optional marketing. Users may opt out of promotional messages without losing access to the service.
- Provide visible report, block/contact-support, consent withdrawal, access/correction/export/deletion request workflows. Define staff response targets and escalation ownership.
- Keep all file objects private, scan before provider access, log every authorized download, and expire signed URLs quickly.
- Publish a clear privacy notice in accessible language. Never use applicant data to sell advertising or build hidden ranking/creditworthiness models.
- Maintain incident response steps for account compromise, provider fraud, unsafe contact, inappropriate content, and data breach.

## Non-functional requirements

- **Connectivity:** core public browsing, saved listings, and draft preparation work after a successful sync; users can see when information was last updated.
- **Performance:** on a typical mobile connection, directory pages should become usable within 3 seconds at the 75th percentile with compressed assets; API read endpoints should target p95 under 700 ms at pilot load, excluding file transfer and external provider latency.
- **Performance testing and capacity reporting:** maintain a repeatable k6 (or equivalent) suite for endpoint throughput and realistic user-flow concurrency. Ramp through 100/250/500/1,000 virtual users and separately increase RPS; run smoke, expected-load, spike, breakpoint/stress, and soak profiles in isolated staging. Define “supported capacity” as the highest tested level meeting R56, not a pre-build user-count promise. Publish test date, application version, instance sizes/count, database configuration, workload mix, duration, RPS, p50/p95/p99, errors, and bottleneck findings.
- **Scale and traffic management:** place a managed load balancer/reverse proxy in front of stateless FastAPI replicas. Route only to healthy instances, support horizontal API/worker scaling, and document vertical scaling as the initial capacity step where appropriate. Keep API instances free of local session/file dependencies. Bound per-instance database pools against a total connection budget; monitor database and queue saturation. Use caching, read replicas, and additional infrastructure only after profiling demonstrates need; do not introduce microservices or Kubernetes solely to satisfy a theoretical scale target.
- **Overload behavior:** define request timeouts, bounded retries with backoff, rate limits for abuse-sensitive endpoints, and safe degradation for non-critical AI/notification features. Background queues must have visibility and alert thresholds; they must not grow without bounds. Public browsing should remain usable if optional AI or messaging integrations are unavailable.
- **Appearance and loading states:** System/Light/Dark themes shall be available on web/PWA and Android. Reusable skeletons shall match final content geometry, minimize layout shift, respect reduced motion, and never substitute for error/empty/offline messaging.
- **Reliability:** pilot service target of 99.5% monthly API availability, excluding planned maintenance; daily encrypted database backups; documented restore test before launch.
- **Security:** HTTPS everywhere, secure secret management, least privilege, rate limiting, input validation, CSRF protection for cookie-authenticated web requests, secure upload controls, dependency scanning, and audit logging.
- **Privacy:** collect only required data, use retention schedules, support rights requests, redact PII from logs, and limit analytics to aggregated or pseudonymized records.
- **Accessibility:** keyboard and screen-reader operation for core web flows; scalable text and touch targets on Android; plain-language errors; no color-only status encoding.
- **Localization:** English at pilot; all UI strings and notification templates externalized for later Igbo translation. Store all timestamps in UTC and display deadlines in WAT.
- **Maintainability:** modular monolith, typed request/response schemas, migrations, generated API clients, reproducible local setup, and clear environment configuration.

## Milestones

1. **Discovery and safeguarding design:** interview users/providers; agree opportunity taxonomy, age/guardian rules, verification checklist, safeguarding escalation, and privacy review. Exit when named pilot partners accept responsibilities.
2. **Foundation:** repository, CI, FastAPI, PostgreSQL migrations, auth/roles, web shell, Android shell, API client generation, audit, deployment environments. Exit when role boundaries and account recovery work end to end.
3. **Directory and provider verification:** public search/detail, provider onboarding, manual verification, provider listing drafts, staff review, expiration, report queue. Exit when a verified provider can publish a reviewed listing visible to visitors.
4. **Applicant workflows:** profiles, age-aware controls, saved listings, offline drafts, in-platform and external applications, status history, private uploads and scanning. Exit when both application paths work and provider data access is correctly scoped.
5. **Application-support sessions and notifications:** support session review/registration, opt-in reminders, deadline queue, SMS/email adapter, delivery history. Exit when failed delivery does not block core flows and minors follow the agreed consent rules.
6. **Pilot readiness:** accessibility review, security/privacy review, restore exercise, abuse/report drill, user training, seed listings, pilot metrics, support runbook. Exit when partner owners approve launch and all critical findings are resolved.

## Acceptance criteria

- **A1 (R1–R7):** A visitor can search/filter, inspect provider verification and full opportunity terms, save/share/print a listing, and identify stale/expired listings. Expired listings no longer appear in default active results.
- **A2 (R8–R15):** A visitor can browse without an account. Verified users can create and manage private profiles. A minor cannot create an application or session registration until the approved guardian safeguard is complete. Eligible minors can apply to scholarships or other age-appropriate listings after that safeguard. No provider can retrieve an applicant profile before submission/consent.
- **A3 (R16–R23):** An unverified organization cannot publish. A verified provider’s draft remains private until staff approval. Material changes require review. Staff actions and report decisions appear in an audit trail.
- **A4 (R24–R32):** An applicant can submit an in-platform form once despite retries, receive a receipt, see status history, and withdraw where enabled. External applications remain clearly applicant-reported. Provider users cannot access another organization’s applications.
- **A5 (R33–R38):** An application-support session requires approval before publication; capacity is enforced; reminders follow channel preferences; organizer roster omits fields not needed for attendance.
- **A6 (R39–R42):** After syncing a listing, both PWA and Android can display it offline and preserve an application draft across restart. Sync conflicts are visible and resolvable. Core flows pass keyboard/screen-reader and scalable-text review.
- **A7 (R43–R44):** Staff dashboard separates self-reported and provider-confirmed outcomes and active/expired listings. Sensitive access, file downloads, consent changes, and moderation actions are auditable.
- **A8 (privacy and operations):** No public URL exposes a CV or application file. Signed links expire. Data deletion/export requests follow policy. Backup restore and abuse/report escalation drills are documented and completed before pilot.
- **A9 (R45–R48):** Staff can see and act on moderation queue age and priority; routine cases are measured against the 48-hour target and urgent safety reports against same-day triage. AI search cites approved listings and remains available through normal search; AI cannot change listing or applicant decisions. No applicant profile or attachment is sent to the AI provider.
- **A10 (R49–R53):** On slow route and data requests, web/PWA and Android show reusable skeletons in the correct regions without layout jumps or fake data; errors, empty results, and offline states have distinct messages/actions. Reduced-motion users do not receive shimmer animation. System/Light/Dark choice survives restart, follows system preference when System is selected, and remains readable and functional across core screens.
- **A11 (R54–R59):** Staging performance scripts can exercise individual endpoints and representative journeys through 100, 250, 500, and 1,000 VUs plus increasing RPS, report the specified percentiles/errors/resource metrics, and identify the highest passing tested capacity. A multi-instance deployment routes around an unhealthy API instance; aggregate DB pool limits remain within the configured budget; retries/queues remain bounded under a simulated dependency slowdown. Results state infrastructure and workload assumptions and do not claim untested capacity.

## Pilot success measures

Measure these without treating activity as proof of social impact:

- Number of verified active providers and current listings, with stale/expired share.
- Search-to-detail and detail-to-application-start rates, segmented only where privacy review permits.
- Application completion and duplicate submission rate for in-platform forms.
- Deadline notification delivery rate and user opt-out rate.
- Support session registration, attendance, and cancellation rates.
- Outcomes reported, split into applicant-reported and provider-confirmed; no placement-rate claim without a defined denominator and follow-up window.
- Number and age of unresolved fraud/content reports and median moderation time.
- Offline draft sync success and conflict rate by client.
- User-reported usefulness and accessibility issues from applicants, guardians, and providers.

## Risks and open questions

### Risks requiring controls before pilot

- **Minor safeguarding and privacy:** the platform serves users under 18 and may hold education records and application documents. Complete legal and safeguarding review before enabling minor accounts or collecting attachments.
- **Fraudulent opportunities:** a verified organization can still publish misleading offers. Keep listing review, reporting, suspension, and user warnings operational.
- **Sensitive document exposure:** CVs and certificates can reveal personal data. Use private storage, scoped access, scanning, expiry, and deletion.
- **Unequal access:** smartphone, data, literacy, disability, gender, and language barriers may exclude the people the platform intends to help. Include assisted/printable workflows and test with users from different communities.
- **Outcome overclaiming:** self-reported application/placement data can be incomplete. Preserve source labels, denominators, and limitations in every report.
- **Partner inactivity:** listings and status updates become stale without committed provider and moderator staff. Establish service ownership and review cadence before launch.

### Launch dependencies and operational decisions

The product choices above are settled for this draft. These items need named owners and evidence during discovery/readiness; they do not block implementation of the corresponding interfaces and workflows:

1. Recruit initial verified providers across Enugu State, with an Awgu-first listing and outreach plan. Keep categories extensible and seed categories partners can maintain: training, scholarships, apprenticeships, formal jobs, and local paid work/gigs.
2. Name the administrator rota and super-administrator escalation owner. A 48-hour initial-response target is realistic if staff coverage, queue ownership, and backup coverage are funded and monitored. Treat it as 48 calendar hours only with weekend coverage; otherwise publish “within two business days.” Critical safeguarding/fraud reports need a separate same-day staffed escalation path.
3. Obtain qualified Nigerian privacy, labor, and safeguarding review for minor consent/age assurance, scholarship application handling, construction work restrictions, and retention. Do not launch affected flows until approved.
4. Confirm Brevo domain authentication, email deliverability, current Termii SMS rates/sender-ID approval, delivery receipts, and who funds SMS credits. Keep adapters replaceable if tests favor Brevo SMS or another provider.
5. Select an AI provider/hosting approach only after data-processing and retention controls are reviewed. The MVP must function without AI and must not pass applicant personal data to the model.
6. Agree with initial scholarship providers on structured application fields, document limits, retention, and access. CV/portfolio are optional profile materials; certificates, transcripts, essays, or recommendations are requested only when the listing requires them. Government ID is never a default attachment.
7. Validate English-first copy with local users and obtain qualified Igbo translations before enabling them.

## Reference material

- Nigeria Data Protection Act 2023, including provisions for children and guardian consent: [Nigeria Data Protection Commission PDF](https://ndpc.gov.ng/wp-content/uploads/2024/03/Nigeria_Data_Protection_Act_2023.pdf)
- Nigeria Data Protection Act General Application and Implementation Directive 2025: [NDPC GAID 2025](https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf)
- UNICEF Nigeria online safety and privacy guidance: [Protecting Children in the Digital World](https://www.unicef.org/nigeria/protecting-children-digital-world)
- Federal Ministry of Labour child labour resources: [Child Labour Programme](https://labour.gov.ng/child-labour-programme/)
- ILO Nigeria child labour observatory: [Nigeria country dashboard](https://webapps.ilo.org/clodashboard/country/1A/NGA)
- ILO Minimum Age Convention: [Convention No. 138](https://normlex.ilo.org/dyn/nrmlx_en/f?p=NORMLEXPUB:12100:0::NO::P12100_ILO_CODE:C138)
- Brevo free-plan email allowance: [About Brevo pricing plans](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans)
- Brevo supported SMS destinations: [SMS supported countries and pricing](https://help.brevo.com/hc/en-us/articles/208717449-Supported-countries-and-pricing-for-SMS-messages)
- Termii messaging/API capabilities and pricing: [Termii API documentation](https://developer.termii.com/) and [Termii pricing](https://termii.com/pricing)
- ZeptoMail transactional email plan: [ZeptoMail pricing](https://www.zoho.com/zeptomail/pricing.html?src=ft); Zoho Mail usage policy: [Usage policy](https://www.zoho.com/mail/help/usage-policy.html)
- Web stack reference: [Next.js App Router](https://nextjs.org/docs/app/getting-started), [Tailwind CSS with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [shadcn/ui for Next.js](https://ui.shadcn.com/docs/installation/next), and [TanStack Query React overview](https://tanstack.com/query/latest/docs/framework/react/overview)
- Mobile stack comparison: [React Native TypeScript](https://reactnative.dev/docs/typescript), [Expo Router](https://docs.expo.dev/router/introduction/), [Expo data storage](https://docs.expo.dev/develop/user-interface/store-data/), and [Flutter architecture](https://docs.flutter.dev/resources/architectural-overview)
