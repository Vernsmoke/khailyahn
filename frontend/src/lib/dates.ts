export const TIMEZONE = "Asia/Manila";
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function today(now = new Date()) {
  return dayFormatter.format(now);
}
export function addDays(date: string, days: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function addMonths(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + months, 1));
  const last = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  first.setUTCDate(Math.min(day, last));
  return first.toISOString().slice(0, 10);
}
// Confirmed: expiry is the first expired day; September 1–15 is grace.
export function graceEnd(expiresOn: string) {
  return addDays(expiresOn, 14);
}
export function manilaDate(timestamp: string) {
  return today(new Date(timestamp));
}
export function dateTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
export function displayDate(date?: string) {
  return date
    ? new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(date + "T00:00:00Z"))
    : "Not activated";
}
