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

export function daysUntil(value: string | null | undefined): number | null {
  const date = parse(value);
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}
