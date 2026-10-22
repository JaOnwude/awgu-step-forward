"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarCheck,
  ClipboardCheck,
  FlaskConical,
  LayoutGrid,
  Printer,
  RefreshCw,
  ShieldAlert,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ErrorState, SectionSkeleton } from "@/components/shared/query-states";
import { applicationStatusLabel } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/account/queries";
import { RedirectToSignIn } from "@/features/account/redirect-to-sign-in";
import { ApiError } from "@/lib/api/client";
import { fetchImpactStats, type CountItem, type ImpactStats } from "@/lib/api/impact";
import { formatWatDate, formatWatDateTime } from "@/lib/format";
import { opportunityTypeLabel } from "@/lib/opportunity-labels";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

const STAFF_ROLES = new Set(["admin", "super_admin"]);
const number = new Intl.NumberFormat("en-NG");

function percent(part: number, whole: number): string {
  return whole ? `${Math.round((part / whole) * 100)}%` : "0%";
}

/** A headline number with one line of context. */
function StatTile({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="grid content-start gap-2 rounded-2xl border bg-card p-5 shadow-xs">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <span className="grid size-8 place-items-center rounded-lg bg-primary-muted text-primary">
          <Icon aria-hidden className="size-4" />
        </span>
        {label}
      </p>
      <p className="font-display text-4xl font-semibold tabular-nums">{number.format(value)}</p>
      <p className="text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid content-start gap-4 rounded-2xl border bg-card p-5 shadow-xs sm:p-6", className)}>
      <div className="grid gap-1">
        <h2 className="text-base font-bold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Horizontal bars for one series. Values are printed beside each bar, so the
 * chart never relies on colour or hover alone, and the list itself is the
 * accessible table of the data.
 */
function BarList({ items, label }: { items: { key: string; label: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  if (items.every((item) => item.count === 0)) {
    return <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>;
  }
  return (
    <ul aria-label={label} className="grid gap-2.5">
      {items.map((item) => (
        <li
          key={item.key}
          title={`${item.label}: ${number.format(item.count)}`}
          className="grid grid-cols-[minmax(6.5rem,9rem)_1fr_2.5rem] items-center gap-3 rounded-md text-sm hover:bg-muted/60"
        >
          <span className="truncate text-muted-foreground">{item.label}</span>
          <span className="h-3 overflow-hidden rounded-r-[4px] bg-muted">
            <span
              className="block h-full rounded-r-[4px] bg-primary transition-[width] duration-700"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </span>
          <span className="text-right font-semibold tabular-nums">{number.format(item.count)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Applications started per week, last eight weeks. */
function WeeklyChart({ weeks }: { weeks: ImpactStats["applications"]["weekly"] }) {
  const max = Math.max(1, ...weeks.map((week) => week.count));
  const total = weeks.reduce((sum, week) => sum + week.count, 0);
  return (
    <div className="grid gap-3">
      <div className="flex h-44 items-end gap-2 border-b border-border/80 pb-px" role="img" aria-label={`Applications started per week over the last eight weeks: ${weeks.map((w) => `${formatWatDate(w.week_start)} ${w.count}`).join(", ")}`}>
        {weeks.map((week, index) => {
          const last = index === weeks.length - 1;
          return (
            <div
              key={week.week_start}
              title={`Week of ${formatWatDate(week.week_start)}: ${week.count}`}
              className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums text-muted-foreground group-hover:text-foreground",
                  last && "text-foreground",
                )}
              >
                {week.count}
              </span>
              <span
                className="w-full max-w-10 rounded-t-[4px] bg-primary transition-[height] duration-700 group-hover:opacity-80"
                style={{ height: `${Math.max(week.count ? 4 : 0, (week.count / max) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 text-[0.7rem] text-muted-foreground">
        {weeks.map((week) => (
          <span key={week.week_start} className="flex-1 text-center">
            {(formatWatDate(week.week_start) ?? "").split(" ").slice(0, 2).join(" ")}
          </span>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {number.format(total)} started in the last eight weeks. Each bar is a week, Monday to
        Sunday.
      </p>
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className="grid gap-0.5 rounded-xl bg-muted/60 px-4 py-3">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className={cn("text-xl font-semibold tabular-nums", tone === "warning" && "text-warning")}>
        {value}
      </dd>
    </div>
  );
}

function toBars(items: CountItem[], labelFor: (key: string) => string) {
  return items.map((item) => ({ key: item.key, label: labelFor(item.key), count: item.count }));
}

function Dashboard({ data, onRefresh, refreshing }: { data: ImpactStats; onRefresh: () => void; refreshing: boolean }) {
  const { listings, people, applications, sessions, trust, providers } = data;
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Updated {formatWatDateTime(data.generated_at)}. Counts only: no names or contacts.
        </p>
        <div className="flex gap-2 print:hidden">
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw aria-hidden className={cn(refreshing && "animate-spin")} /> Refresh
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            <Printer aria-hidden /> Print or save as PDF
          </Button>
        </div>
      </div>

      {data.includes_demo_data ? (
        <div role="note" className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning-muted p-4 text-sm">
          <FlaskConical aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
          <p>
            <span className="font-semibold">These figures include synthetic demo activity.</span>{" "}
            The applicants, saves and applications behind them are made up for the demo. Real
            figures replace them once the pilot starts.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={LayoutGrid}
          label="Live opportunities"
          value={listings.live}
          note={`${number.format(listings.live_in_awgu)} in Awgu · ${number.format(listings.closing_soon)} closing this week`}
        />
        <StatTile
          icon={Users}
          label="Applicants"
          value={people.applicants}
          note={`${percent(people.from_awgu, people.with_profile)} of profiles are from Awgu LGA`}
        />
        <StatTile
          icon={ClipboardCheck}
          label="Applications started"
          value={applications.total}
          note={`${number.format(applications.last_30_days)} in the last 30 days`}
        />
        <StatTile
          icon={Trophy}
          label="Good outcomes"
          value={applications.positive_outcomes}
          note="Offered, accepted or completed"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Applications started each week" description="Reach over time: the number partners ask about first.">
          <WeeklyChart weeks={applications.weekly} />
        </Panel>
        <Panel title="Where applicants come from" description="Town or LGA from applicant profiles.">
          <BarList label="Applicants by town" items={toBars(people.by_town, (key) => key)} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Live opportunities by category">
          <BarList
            label="Live opportunities by category"
            items={toBars(listings.by_category, opportunityTypeLabel)}
          />
        </Panel>
        <Panel
          title="Where applications stand"
          description={`${number.format(applications.in_platform)} applied here · ${number.format(applications.tracked_elsewhere)} tracked on the provider’s own site`}
        >
          <BarList
            label="Applications by status"
            items={toBars(applications.by_status, applicationStatusLabel)}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Help sessions">
          <dl className="grid grid-cols-2 gap-3">
            <Figure label="Upcoming" value={number.format(sessions.upcoming)} />
            <Figure label="Held" value={number.format(sessions.held)} />
            <Figure label="Sign-ups" value={number.format(sessions.registrations)} />
            <Figure label="Attended" value={number.format(sessions.attended)} />
          </dl>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarCheck aria-hidden className="size-4" />
            {number.format(people.saved_listings)} listings saved by applicants
          </p>
        </Panel>
        <Panel title="Reminders">
          <dl className="grid grid-cols-2 gap-3">
            <Figure label="Reminders sent" value={number.format(trust.reminders_sent)} />
            <Figure label="Closing this week" value={number.format(listings.closing_soon)} />
          </dl>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bell aria-hidden className="size-4" />
            Deadline and session reminders, by email
          </p>
        </Panel>
        <Panel title="Trust and safety">
          <dl className="grid grid-cols-2 gap-3">
            <Figure
              label="Reports open"
              value={`${number.format(trust.reports_open)}${trust.reports_urgent_open ? ` (${trust.reports_urgent_open} urgent)` : ""}`}
              tone={trust.reports_urgent_open ? "warning" : undefined}
            />
            <Figure label="Reports resolved" value={number.format(trust.reports_resolved)} />
            <Figure label="Listings suspended" value={number.format(trust.listings_suspended)} />
            <Figure label="Awaiting review" value={number.format(listings.pending_review)} />
          </dl>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldAlert aria-hidden className="size-4" />
            {number.format(providers.verified)} verified providers · {number.format(providers.pending)} pending ·{" "}
            {number.format(listings.public_announcements)} public announcements
          </p>
        </Panel>
      </div>
    </div>
  );
}

/** The staff impact dashboard: what partners and funders ask to see. */
export function ImpactDashboard() {
  const userQuery = useCurrentUser();
  const user = userQuery.data ?? null;
  const isStaff = Boolean(user?.roles.some((role) => STAFF_ROLES.has(role)));
  const stats = useQuery({
    queryKey: queryKeys.impact,
    queryFn: fetchImpactStats,
    enabled: isStaff,
  });

  if (userQuery.isPending) return <SectionSkeleton label="Checking your session…" />;
  if (userQuery.isError) {
    return <ErrorState error={userQuery.error} onRetry={() => userQuery.refetch()} />;
  }
  if (!user) return <RedirectToSignIn next="/admin/impact" />;
  if (!isStaff) {
    return (
      <ErrorState
        title="Staff access only"
        error={new ApiError(403, "forbidden", "This dashboard is for platform administrators.")}
      />
    );
  }
  if (stats.isPending) return <SectionSkeleton label="Counting…" />;
  if (stats.isError) return <ErrorState error={stats.error} onRetry={() => stats.refetch()} />;

  return (
    <Dashboard data={stats.data} onRefresh={() => stats.refetch()} refreshing={stats.isFetching} />
  );
}
