export function nowInZone(tz: string): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
}

export function formatTimeInZone(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDateTimeInZone(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function tzAbbrev(tz: string, date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  }).formatToParts(date);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

/**
 * Given a wall-clock date/time string typed in `tz`, returns the equivalent UTC Date.
 * dateTimeLocal: "YYYY-MM-DDTHH:mm" (as produced by <input type="datetime-local">)
 */
export function zonedDateTimeToUtc(dateTimeLocal: string, tz: string): Date {
  const [datePart, timePart] = dateTimeLocal.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  // Find the UTC instant whose wall-clock representation in `tz` matches the input,
  // by comparing against the offset derived from a guess and correcting once.
  const guessUtc = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offsetMinutes = getTimeZoneOffsetMinutes(guessUtc, tz);
  return new Date(guessUtc.getTime() - offsetMinutes * 60000);
}

function getTimeZoneOffsetMinutes(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return (asUtc - date.getTime()) / 60000;
}

/** Returns minutes since local midnight for a UTC instant viewed in `tz`. */
function minutesOfDayInZone(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return Number(map.hour) * 60 + Number(map.minute);
}

function timeStringToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Returns true if `date` (a UTC instant) falls within the awake window
 * (awakeStart-awakeEnd, in HH:mm local time) for the given timezone.
 * Handles windows that don't cross midnight (e.g. 07:00-23:00).
 */
export function isWithinAwakeWindow(
  date: Date,
  tz: string,
  awakeStart: string,
  awakeEnd: string
): boolean {
  const minutes = minutesOfDayInZone(date, tz);
  const start = timeStringToMinutes(awakeStart);
  const end = timeStringToMinutes(awakeEnd);
  if (start <= end) {
    return minutes >= start && minutes <= end;
  }
  // window crosses midnight
  return minutes >= start || minutes <= end;
}

export interface AwakeWindowCheckResult {
  withinWindow: boolean;
  warning: string | null;
}

export function checkAwakeWindow(
  date: Date,
  otherUserName: string,
  otherTz: string,
  awakeStart: string,
  awakeEnd: string
): AwakeWindowCheckResult {
  const within = isWithinAwakeWindow(date, otherTz, awakeStart, awakeEnd);
  if (within) return { withinWindow: true, warning: null };
  const time = formatTimeInZone(date, otherTz);
  return {
    withinWindow: false,
    warning: `This is ${time} for ${otherUserName} — outside their usual hours.`,
  };
}
