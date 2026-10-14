const watDateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Lagos",
});

const watDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Lagos",
});

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatWatDateTime(value: string | null | undefined): string | null {
  const date = parse(value);
  return date ? watDateTime.format(date) : null;
}

export function formatWatDate(value: string | null | undefined): string | null {
  const date = parse(value);
  return date ? watDate.format(date) : null;
}

const watPart = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "Africa/Lagos" });
const watWeekday = watPart({ weekday: "short" });
const watDay = watPart({ day: "numeric" });
const watMonth = watPart({ month: "short" });
const watTime = watPart({ hour: "2-digit", minute: "2-digit" });

/** Calendar-block pieces in West Africa Time, e.g. { weekday: "Sat", day: "19", month: "Oct" }. */
export function watDateParts(value: string | null | undefined) {
  const date = parse(value);
  if (!date) return null;
  return {
    weekday: watWeekday.format(date),
    day: watDay.format(date),
    month: watMonth.format(date),
    time: watTime.format(date),
  };
}

export function formatWatTime(value: string | null | undefined): string | null {
  const date = parse(value);
  return date ? watTime.format(date) : null;
}

export function daysUntil(value: string | null | undefined): number | null {
  const date = parse(value);
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}
