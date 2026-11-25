import { addDays } from "./pricing";

/** RFC 5545 TEXT escaping: backslash, semicolon, comma and line breaks. */
export const escapeIcsText = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");

const encoder = new TextEncoder();

/** Folds a content line at 75 octets (never inside a UTF-8 character); continuation lines start with one space. */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  let limit = 75; // continuation lines lose one octet to the leading space
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (bytes + n > limit) {
      out.push(current);
      current = "";
      bytes = 0;
      limit = 74;
    }
    current += ch;
    bytes += n;
  }
  out.push(current);
  return out.join("\r\n ");
}

const compactDate = (iso: string) => iso.replace(/-/g, "");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/**
 * A one-event all-day calendar. `DTEND` is exclusive, so it is the day after the last trip day:
 * a 3-day trip starting 2027-06-01 ends (exclusive) on 2027-06-04.
 */
export function buildIcs(e: {
  uid: string;
  summary: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  durationDays: number;
  now?: Date;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NomadTrip//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(e.uid)}`,
    `DTSTAMP:${stamp(e.now ?? new Date())}`,
    `DTSTART;VALUE=DATE:${compactDate(e.startDate)}`,
    `DTEND;VALUE=DATE:${compactDate(addDays(e.startDate, e.durationDays))}`,
    `SUMMARY:${escapeIcsText(e.summary)}`,
    `DESCRIPTION:${escapeIcsText(e.description)}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
