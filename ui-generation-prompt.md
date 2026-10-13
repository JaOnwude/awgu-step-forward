# Awgu StepForward — Figma AI prompt pack

The product name is **Awgu StepForward**. This file contains a shared product/design brief and focused screen prompts. Some AI design tools interpret a long brief as a request for one landing page. To avoid that, first run the shared brief to establish the design language, then run the screen prompts one at a time in the same Figma file. Tell the tool to create new frames/pages and preserve earlier work. Attach the final brand assets when available and provide `spec.md` as the product source of truth.

## Shared product and visual brief

```text
Act as a senior product designer and design-system lead. Establish the design foundations and reusable component system for **Awgu StepForward**, a low-bandwidth opportunity discovery and application service for Enugu State, Nigeria, with Awgu LGA prioritized. Descriptor: “Verified opportunities for learning, work, and your next step.” The product connects people to verified training, scholarships, apprenticeships, SME vacancies, entry-level jobs, and safe paid local work. It supports a responsive website/PWA and an applicant-focused Android app.

PRODUCT POSITIONING AND NON-NEGOTIABLES
- This is a verified opportunity directory and application tracker, not LinkedIn and not a social-media platform. Do not design a public profile feed, likes, follows, public CVs, or open messaging.
- Applicant profiles are private. Show exactly what profile fields and files an application will share before submission. External applications open the provider’s site and are tracked manually by the applicant.
- Organizations, SMEs, independent employers, and household project owners may submit opportunities. Listings are reviewed by staff before publication. Show verification status and freshness clearly without implying government endorsement.
- Include local work/day-labor listings. Work cards/details must make task, pay, dates/hours, location/community, supervisor, and safety/PPE information easy to scan. Construction-site labor is adults-only under the initial platform safety policy; never show it as eligible to minors.
- Scholarship applications may use platform forms and optional required documents. Never make national ID a default requirement.
- “Application-support sessions” are optional workshops/help desks for scholarship forms, CVs, interviews, apprenticeships, and digital literacy. They are not medical clinics.
- The app must feel useful on low-end Android phones and weak connections. Prefer clarity and fast scanning over decorative complexity. Include loading, empty, error, offline, saved, expired, and success states.
- Do not fabricate opportunities, endorsements, testimonials, partner logos, or statistics. Use clearly labeled demo content if needed.

VISUAL REFERENCES — KEEP THEIR ROLES DISTINCT
1. Global visual language: https://www.joincolab.io
   Draw inspiration from its spacing/rhythm, whitespace, contrast, buttons, type hierarchy, navigation, composition, premium editorial feel, section pacing, and transitions. Adapt these ideas to this product and create original values.
2. Application-support services page composition: https://themewagon.github.io/Profusion/services.html
   Study service-card/section composition, scroll/reveal rhythm, section transitions, and how content is introduced. Do not copy its palette, fonts, assets, code, text, or branding.
3. Other pages and responsive storytelling: https://www.joincolab.io/partnerships-menu
   Use as inspiration for hierarchy, navigation/menus, content grouping, responsive behavior, editorial composition, and interaction patterns. Improve any pattern that harms clarity, accessibility, or usability.
4. Use Dribbble for conceptual visual directions, Mobbin for real shipped product flows, Awwwards/Land-book for page composition, and Behance for identity/case-study ideas. These are inspiration only. Never copy exact screens or proprietary assets.

BRAND AND DESIGN SYSTEM
Create an original, credible, warm, modern, editorial brand that feels locally grounded and trustworthy—not a generic government portal or a high-gloss venture-capital dashboard. Propose a restrained palette with accessible contrast and show rationale. Do not assume a final logo exists; use a simple replaceable wordmark placeholder. Prefer legible type, clear hierarchy, generous but efficient spacing, strong content cards, calm surfaces, and unmistakable status/safety indicators.

Create a documented token system for font families/weights, type scale/line heights, color roles, spacing, content widths, breakpoints, radii, borders, shadows, buttons, focus rings, transitions/easing, and motion preferences. Include semantic colors that remain understandable without color alone. Build reusable components and variants for navigation, buttons, cards, filter chips, search, form controls, status badges, provider verification, deadlines, cost/pay, safety warnings, upload controls, application progress, tables, dialogs, toasts, empty states, and offline banners. Use subtle purposeful motion only; respect `prefers-reduced-motion`, avoid scroll-jacking/parallax, and ensure touch/keyboard/screen-reader accessibility.

DELIVERABLES / FIGMA FILE STRUCTURE
Create a polished Figma file with pages for: 00 Cover & product principles; 01 Foundations/tokens; 02 Components and variants; 03 Responsive web/PWA; 04 Android; 05 Admin/provider operations; 06 Clickable prototype; 07 Accessibility and interaction notes. Use Auto Layout, named components, variants, constraints, and realistic content. Include desktop, tablet, and mobile frames; annotate behavior where a static mock cannot explain it. Use consistent spacing and component naming so a developer can implement it with Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui; also keep Android patterns practical for React Native/Expo. The codebase uses Bun for JavaScript/TypeScript and uv for Python/FastAPI; do not generate setup instructions using npm, pnpm, or pip.

OUTPUT RULE: Do not make only a landing page. Create each requested screen as its own clearly named Figma frame. For this shared-brief run, create the cover, foundations, and reusable components only. The screen prompts below create the actual product screens in separate runs. Preserve these foundations for every later run.

PRODUCT SCREEN INVENTORY — CONTEXT FOR THE FOCUSED PROMPTS BELOW; DO NOT GENERATE THESE SCREENS IN THIS FOUNDATION RUN
1. Public landing page with clear value proposition, Enugu/Awgu context, category entry points, how verification works, partner CTA, and trust/safety explanation.
2. Opportunity directory: search, filters for category/LGA/age/education/deadline/mode/cost or pay, Awgu-priority indicator, sort controls, accessible filter drawer on mobile, result count, cards, no-results state, offline/last-updated state.
3. Opportunity details: provider verification, eligibility, deadline in WAT, location/service area, full cost/funding or pay terms, required documents, application route, work safety and adults-only indicators when relevant, report action, save/share/print actions.
4. Applicant onboarding: choose phone or email verification, age-aware flow, guardian step for minors (clearly indicate this is a safeguarded flow), private profile, notification choices, consent summaries. Do not design collection of government ID by default.
5. Scholarship application: listing-specific questions, upload only requested files, save draft, offline state, review exactly what will be shared, submit confirmation/receipt, status timeline, withdrawal where allowed. Show errors and interrupted network recovery.
6. External application tracking: clearly open provider site, then let applicant mark status and add a private note; explain that these statuses are applicant-reported.
7. Local paid work: employer/work listing submission, required fields for task/pay/hours/worksite/supervisor/safety, adult-only check for construction, then an applicant interest/application and clear contact privacy. Do not expose a minor’s phone/home address.
8. Application-support sessions: event list/detail, accessibility/age suitability, capacity, registration/cancel, reminder preference, organizer check-in roster with minimal personal data.
9. Provider portal: verification progress, opportunity draft, preview, submission for review, requests for changes, listing status, applications limited to that provider, outcome updates.
10. Staff/admin workspace: provider verification queue, listing review, fraud/safety reports, same-day urgent triage and routine 48-hour queue targets, assignment/aging/overdue states, approve/reject/request changes/suspend actions, audit history, aggregate outcomes with privacy-aware labels.
11. Applicant dashboard: saved opportunities, application drafts and statuses, deadline reminders, profile/privacy controls, deletion/export, and low-data/offline state.

PROTOTYPE AND HANDOFF QUALITY
Create clickable prototypes for directory-to-detail-to-application, scholarship application submission, work opportunity safety screening, provider listing review, and admin report handling. Use realistic Nigerian names, Naira formatting (₦), Enugu communities/LGAs, and West Africa Time, but label all records as sample data. Provide a compact screen inventory and component/state notes. Clearly distinguish server-confirmed, applicant-reported, pending, expired, and unverified states. Deliver an original system that is visually distinctive while still practical, accessible, responsive, and straightforward to implement. Treat the attached product specification as authoritative whenever this prompt leaves a behavior ambiguous.
```

## Focused screen prompts

Run each prompt below separately after the shared brief. Keep all work in the same Figma file. Each prompt should add new named frames on the matching page, use the established tokens/components, and preserve previously created frames. If the tool only creates one frame per request, create one frame per prompt and repeat for the listed responsive variants. Do not regenerate the cover or foundations each time.

### 1. Public landing page

```text
Using the Awgu StepForward shared brief and established design system, create the complete public landing page—not a generic hero mockup. Add two named frames to “03 Responsive web/PWA”: Desktop 1440px and Mobile 390px. Include: navigation with logo, Opportunities, How it works, Support sessions, For providers, Sign in, and a prominent Create account action; hero headline “Find your next step, closer to home” with Enugu/Awgu context and Browse opportunities / List an opportunity CTAs; a compact search-by-keyword-and-location module; category tiles for Scholarships, Skills & training, Apprenticeships, Jobs, and Local paid work; a featured verified opportunity section with realistic sample cards; a clear 3-step “Find, apply, track” explanation; provider verification and scam-awareness section; application-support session feature; a partner/SME call to action; and footer with contact, privacy, accessibility, and report-a-listing links. Use sample data labels, no fake statistics or fabricated endorsements. Show desktop section rhythm and mobile stacking/navigation. Make this feel like an original premium editorial product, not a copied reference.
```

### 2. Sign in and create account

```text
Add a complete authentication flow to “03 Responsive web/PWA” using Awgu StepForward tokens. Create separately named desktop and mobile frames for: Sign in; Create account; Verify phone/email code; Verification error/resend cooldown; and account recovery. The first screen lets a person choose phone or email as their verification method, with a clear low-friction explanation and no password assumption unless the product spec calls for it. Signup collects only necessary initial information and links to privacy/terms; it does not ask for a CV, national ID, or public profile. Include validation, loading, wrong/expired code, resend countdown, change contact method, success, and network failure states. Make the form narrow, calm, accessible, keyboard-friendly, and usable on a low-end phone. Do not combine login and signup into one undifferentiated screen.
```

### 3. Age-aware onboarding and profile setup

```text
Create a multi-step applicant onboarding flow in “03 Responsive web/PWA”, desktop and mobile frames for each step: basic profile; age band/date-of-birth entry with privacy explanation; minor guardian-contact and consent pending/success states; location/community and education; interests/skills; optional CV/portfolio; notification preferences; privacy review and completion. Clearly show progress and save-and-return behavior. Minimize data collection. A minor’s profile remains private; represent guardian safeguards without requesting government ID by default. Include a guardian unable-to-continue/help state, field errors, and offline interruption. Do not imply that guardian consent guarantees eligibility for every opportunity.
```

### 4. Opportunity directory and search results

```text
Create the full opportunity browse experience in “03 Responsive web/PWA”: desktop results page, mobile results page, and mobile filter drawer. Use Enugu State sample listings and prioritize Awgu in the default context while allowing statewide search. Include search input, location selector, category tabs/filters, education/age filters, deadline, delivery mode, costs/funding and pay filters, sort, result count, active filter chips, clear-all, and cards for scholarship, training, SME vacancy, apprenticeship, and local work. Cards show title, provider verification, community/LGA, category, deadline or work dates, cost/pay summary, update date, and clear save action. Include no results, stale/expired listing, loading skeleton, offline/last synced, and failed search states. Make safety and adults-only eligibility unmistakable where relevant. Do not rely on color alone.
```

### 5. Opportunity details

```text
Create two detailed opportunity pages in “03 Responsive web/PWA”: (A) scholarship/training listing, (B) paid construction labor listing. Include desktop and mobile for each. The scholarship screen must show verified provider, eligibility, deadline in WAT, funding/costs, required documents, application route, last review/update, save/share/report actions, and a primary Apply button. The construction listing must show employer verification, adult-only badge, exact task/scope, pay and payment timing, hours/dates, worksite community (not a worker’s home address), supervisor, PPE/safety requirements, eligibility, and a safe Express interest/Apply action. Include a “what you will share” preview before applying. Add expired, under-review, reported, and unavailable states. Ensure information is scannable, trustworthy, and never implies government endorsement or guaranteed outcome.
```

### 6. Applicant home and application tracker

```text
Add an authenticated applicant dashboard in “03 Responsive web/PWA” with desktop and mobile frames. Include welcoming but private header, saved opportunities, applications grouped by Draft / Submitted / In progress / Closed, deadlines and opt-in reminders, recently viewed, recommended categories based only on selected interests (no opaque employability score), and application-support sessions. Add profile/privacy controls, notification settings, export/delete entry points, offline/last-sync state, empty states, and a clear “external application—status self-reported” label. Do not show the applicant publicly or create social feed features.
```

### 7. In-platform scholarship application

```text
Create a four-step scholarship application flow in “03 Responsive web/PWA”, desktop and mobile: (1) requirements and eligibility acknowledgement; (2) provider-defined form questions; (3) requested document upload; (4) review exactly what will be shared and submit. Then create submission receipt and application status timeline frames. Show only documents required by this listing; never request government ID by default. Include save draft, offline edits and queued sync, upload scanning/pending state, invalid file, upload retry, deadline passed, guardian safeguard pending where applicable, duplicate submission prevention, successful receipt/reference, and withdraw state. No document should appear public. Keep the applicant’s control and data-sharing scope explicit.
```

### 8. External application tracker

```text
Create an external-application handoff and tracking flow in “03 Responsive web/PWA”, desktop and mobile. Show an explanation that the provider’s site is outside Awgu StepForward, a safe Open provider application button, and a return-to-app screen asking whether the person submitted. Let the applicant record a status, date, and private note. Mark every external status “Reported by you—not confirmed by provider.” Include not submitted, submitted, interview, offer, rejected, withdrawn, and completed states; do not imply that clicking the external link means an application was submitted.
```

### 9. Application-support sessions

```text
Create an application-support sessions discovery page, event detail, registration confirmation, and organizer attendance roster in “03 Responsive web/PWA”; desktop and mobile. Sessions are practical workshops/help desks for scholarship forms, CVs, interview practice, apprenticeship readiness, or digital skills—not health services. Show topic, organizer verification, date/time in WAT, venue or remote method, accessibility, age suitability, capacity, privacy-safe contact, register/cancel, and optional reminder choice. The organizer roster shows only the minimum information needed to check attendance. Include full, cancelled, waitlist, offline, and registration-closed states.
```

### 10. Provider and local-employer workspace

```text
Create provider onboarding and opportunity management screens in “05 Admin/provider operations”; desktop and mobile responsive. Include verification checklist/status, supported provider types (SME, training provider, school, nonprofit, employer, household project owner), evidence upload with alternate verification route for individual employers, listing draft form, preview, submit-for-review, requested changes, approved/expired/suspended statuses, and applications scoped to that provider only. Add distinct form fields for scholarship listings and paid work: exact task, pay, payment timing, work dates/hours, location, supervisor, safety/PPE, minimum age. No vague labor ads. Provide AI draft-assistance as a clearly optional “Suggest clearer wording” action; show proposed edits side-by-side and require human acceptance. Never make AI publish or approve a listing.
```

### 11. Staff moderation dashboard

```text
Create an admin operations workspace in “05 Admin/provider operations” at desktop 1440px plus a usable tablet layout. Build separate tabs/queues for provider verification, listing review, reports, and application-support sessions. Show owner, priority, age, 48-hour routine target, overdue status, and a distinct urgent same-day safeguarding/fraud queue. Detail panels should show evidence, opportunity terms, age/safety checks, reporter information only when necessary, audit history, and reasoned approve/reject/request-changes/suspend controls. Add confirmation and success states, empty/loading/error states, and escalation to super-admin. Dashboard charts must label sample data and distinguish applicant-reported from provider-confirmed outcomes. Do not expose unnecessary applicant documents.
```

### 12. Android applicant app

```text
Create native Android screens for Awgu StepForward using the shared brand tokens but native React Native/Expo-friendly components, not web page layouts. Add frames for: welcome/sign-in; create account and code verification; applicant home; opportunity search/results; filters; scholarship detail; safe local-work detail; save; application form/review/receipt; external status tracking; application-support session list/detail/register; notification preferences; profile/privacy; offline/last-synced; and sync-conflict resolution. Use Android status/navigation bars, 48dp touch targets, scalable type, back navigation, low-data treatment, accessible contrast, and bottom navigation only where it helps. Create a realistic phone frame (e.g. 360×800 logical px) and annotate native interactions. Do not include public profiles, social feed, direct messaging, or background location.
```

### 13. Clickable prototype connections

```text
Connect existing Awgu StepForward frames into these clickable prototypes without redesigning the screens: (1) landing → directory → detail → scholarship application → receipt → tracker; (2) landing → local work detail → adult eligibility → express interest; (3) provider draft → review queue → staff request changes → provider edit → approved listing; (4) report safety concern → urgent admin queue → suspend listing → audit result; (5) session listing → detail → register → reminder preference. Add hotspot annotations and explain what is client-only versus confirmed by the server. Preserve prior frames and components.
```
