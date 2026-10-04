"use client";

// Relative time ("3h ago") with the full date on hover. Server and browser clocks differ,
// so hydration differences are expected here and nowhere else.

const full = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const rel = new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "short" });

export function relative(iso: string) {
  const s = Math.round((Date.parse(iso) - Date.now()) / 1000);
  const a = Math.abs(s);
  if (a < 45) return "just now";
  if (a < 3600) return rel.format(Math.round(s / 60), "minute");
  if (a < 86400 * 2) return rel.format(Math.round(s / 3600), "hour");
  return rel.format(Math.round(s / 86400), "day");
}

export function Time({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={full.format(new Date(iso))} suppressHydrationWarning>
      {relative(iso)}
    </time>
  );
}
