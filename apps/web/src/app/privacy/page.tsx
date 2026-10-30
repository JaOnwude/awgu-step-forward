import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Privacy notice — Awgu StepForward",
  description:
    "What Awgu StepForward collects, why, where it is stored, how long we keep it, and your rights under the Nigeria Data Protection Act 2023.",
};

const LAST_UPDATED = "30 October 2026";
// Set NEXT_PUBLIC_PRIVACY_EMAIL in Vercel to publish a contact address.
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <h2 id={id} className="font-display text-2xl font-semibold">
        {title}
      </h2>
      <div className="grid gap-3 text-muted-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:grid [&_ul]:gap-1.5">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <article className="mx-auto grid w-full max-w-3xl gap-10 px-4 py-10 sm:px-6 sm:py-14">
      <header className="grid gap-3">
        <p className="eyebrow text-highlight">Privacy notice</p>
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Your data, plainly</h1>
        <p className="text-lg text-muted-foreground">
          What Awgu StepForward collects, why, where it is kept and what you can do about
          it, under the Nigeria Data Protection Act 2023 (NDPA).
        </p>
        <p className="text-sm text-muted-foreground">Last updated {LAST_UPDATED}.</p>
      </header>

      <Section id="who" title="Who we are">
        <p>
          Awgu StepForward is a pilot that helps young people in Awgu and across Enugu
          State find verified scholarships, training, jobs and local paid work. The
          StepForward team decides how your data is used, which makes us its{" "}
          <strong>data controller</strong>.
        </p>
      </Section>

      <Section id="browse" title="Browsing needs no account">
        <p>
          You can search and read every listing without signing in. We use no
          advertising, analytics or session-recording tools, and our fonts are served
          from our own site, so browsing doesn&rsquo;t send your details to anyone else.
        </p>
      </Section>

      <Section id="collect" title="What we collect, and why">
        <ul>
          <li>
            <strong>Account:</strong> your email address (or phone number), and a
            password if you choose one, stored only as a scrambled hash. Used to sign you
            in.
          </li>
          <li>
            <strong>Profile:</strong> your preferred name, date of birth, LGA and
            community, and, if you add them, education, interests, skills and experience.
            Used to show opportunities that fit you, check age limits and prepare
            applications. Your profile is never public.
          </li>
          <li>
            <strong>Profile picture</strong> (optional): cropped, resized and stripped of
            hidden details such as location. Only you see it.
          </li>
          <li>
            <strong>Your activity:</strong> saved listings, applications and their
            answers, application status updates you record, and support sessions you
            sign up for. Providers see an application only when you send it to them.
          </li>
          <li>
            <strong>Reminders:</strong> your notification choices and the reminders we
            send. Email reminders are off unless you turn them on.
          </li>
          <li>
            <strong>Reports</strong> you make about a listing, to keep the site safe.
          </li>
          <li>
            <strong>Sign-in records:</strong> one-time codes (expire after 10 minutes) and
            your signed-in sessions, to keep your account secure.
          </li>
        </ul>
        <p>
          <strong>Lawful basis:</strong> your <strong>consent</strong> when you create an
          account and fill in your profile, and our <strong>legitimate interest</strong>{" "}
          in keeping the service safe (sign-in security, reports and the audit log). You
          can withdraw consent at any time by deleting your account.
        </p>
      </Section>

      <Section id="children" title="Under 18">
        <p>
          Anyone can browse listings. Profiles and applications are for people aged 18
          and over during this pilot, because the NDPA requires a parent or guardian to
          consent for a child. A guardian-linked option is planned.
        </p>
      </Section>

      <Section id="where" title="Who handles it, and where">
        <p>
          We don&rsquo;t sell your data or share it for advertising. These services
          store or process it for us, under their own data protection terms:
        </p>
        <ul>
          <li>
            <strong>Vercel</strong> hosts the website (servers worldwide).
          </li>
          <li>
            <strong>Render</strong> runs our server and <strong>Neon</strong> hosts our
            database, in the European Union (Frankfurt).
          </li>
          <li>
            <strong>Resend</strong> sends sign-in codes and reminder emails (United
            States).
          </li>
          <li>
            <strong>Anthropic</strong> powers the optional plain-language search
            (United States). We remove email addresses and phone numbers from your
            question before sending it, and we don&rsquo;t store the question.
          </li>
        </ul>
        <p>
          This means your data is transferred outside Nigeria. We rely on your consent
          and on these providers&rsquo; contractual safeguards for those transfers, as
          the NDPA allows.
        </p>
      </Section>

      <Section id="keep" title="How long we keep it">
        <p>
          We keep your data while your account is open. When you delete your account,
          your profile, picture, saved listings, applications, session sign-ups,
          reminders and sign-in records are removed from our database straight away.
          Reports you made and our audit log stay, but no longer linked to you. Backups
          kept by our database provider expire on their own after a short period.
        </p>
      </Section>

      <Section id="rights" title="Your rights">
        <p>Under the NDPA you can:</p>
        <ul>
          <li>see and correct your data: edit your profile on your account page;</li>
          <li>
            get a copy of it: <strong>Download my data</strong> on your account page;
          </li>
          <li>
            have it deleted: <strong>Delete my account</strong> on your account page;
          </li>
          <li>withdraw consent, or object to how we use your data;</li>
          <li>
            complain to the Nigeria Data Protection Commission (NDPC) at{" "}
            <a
              href="https://ndpc.gov.ng"
              className="font-semibold text-primary hover:underline"
              rel="noreferrer"
              target="_blank"
            >
              ndpc.gov.ng
            </a>
            .
          </li>
        </ul>
        <p>
          Your account page is at{" "}
          <Link href="/account" className="font-semibold text-primary hover:underline">
            My account
          </Link>
          .{" "}
          {CONTACT_EMAIL ? (
            <>
              For anything else, email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-semibold text-primary hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </>
          ) : (
            "A contact email for privacy questions will be listed here soon."
          )}
        </p>
      </Section>

      <Section id="changes" title="Changes">
        <p>
          If we change this notice, we&rsquo;ll update the date at the top, and tell
          signed-in users about important changes.
        </p>
      </Section>
    </article>
  );
}
