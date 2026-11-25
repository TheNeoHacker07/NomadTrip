import { describe, expect, it } from "vitest";
import { buildIcs, escapeIcsText, foldLine } from "./ics";

const base = {
  uid: "NT-ABCD2345@nomadtrip",
  summary: "Song-Kul",
  description: "Booking NT-ABCD2345",
  startDate: "2027-06-01",
  durationDays: 3,
  now: new Date("2027-01-02T03:04:05.678Z"),
};

describe("buildIcs", () => {
  it("emits an all-day event with an exclusive end the day after the last trip day", () => {
    const ics = buildIcs(base);
    expect(ics).toContain("DTSTART;VALUE=DATE:20270601\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20270604\r\n");
    expect(ics).toContain("DTSTAMP:20270102T030405Z\r\n");
    expect(ics).toContain("UID:NT-ABCD2345@nomadtrip\r\n");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VEVENT\r\nEND:VCALENDAR\r\n")).toBe(true);
  });

  it("rolls the end date over month and year boundaries", () => {
    expect(buildIcs({ ...base, startDate: "2027-12-30", durationDays: 4 })).toContain("DTEND;VALUE=DATE:20280103");
  });

  it("escapes text values", () => {
    const bs = String.fromCharCode(92);
    const ics = buildIcs({ ...base, summary: `A, B; C${bs}D`, description: "line1\nline2" });
    expect(ics).toContain(`SUMMARY:A${bs}, B${bs}; C${bs}${bs}D\r\n`);
    expect(ics).toContain(`DESCRIPTION:line1${bs}nline2\r\n`);
  });

  it("uses CRLF only and folds every line to at most 75 octets", () => {
    const ics = buildIcs({ ...base, description: "Бронирование " + "х".repeat(200) });
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("carries no contact or health fields", () => {
    expect(buildIcs(base)).not.toMatch(/ATTENDEE|ORGANIZER|@example|MAILTO/i);
  });
});

describe("foldLine", () => {
  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("unfolds back to the original and never splits a multi-byte character", () => {
    const line = "DESCRIPTION:" + "Соң-Көл ".repeat(30);
    const folded = foldLine(line);
    expect(folded).toContain("\r\n ");
    expect(folded.replace(/\r\n /g, "")).toBe(line);
    for (const part of folded.split("\r\n")) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
  });
});

describe("escapeIcsText", () => {
  it("escapes backslash first so later escapes survive", () => {
    const bs = String.fromCharCode(92);
    expect(escapeIcsText(`a${bs};b`)).toBe(`a${bs}${bs}${bs};b`);
  });
});
