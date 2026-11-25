/** UTF-8 byte order mark: makes Excel read the file as UTF-8 (Cyrillic) instead of the local code page. */
export const CSV_BOM = "\uFEFF";

/** Characters that make a spreadsheet treat a cell as a formula. */
const FORMULA_START = /^\s*[=+\-@]|^[\t\r\n]/;
/** Plain phone numbers can't be formulas, so they stay usable un-prefixed. */
const PLAIN_PHONE = /^\+?[0-9\s()-]{7,20}$/;

/**
 * One RFC 4180 field. Cells that start like a formula get a leading `'` (CSV injection),
 * and any cell with a comma, quote or line break is quoted with inner quotes doubled.
 */
export function csvCell(value: string | number | null | undefined): string {
  let s = value == null ? "" : String(value);
  if (FORMULA_START.test(s) && !PLAIN_PHONE.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** BOM + CRLF-terminated records, ready to send as `text/csv; charset=utf-8`. */
export function buildCsv(header: readonly string[], rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  return CSV_BOM + [header, ...rows].map((r) => r.map(csvCell).join(",") + "\r\n").join("");
}
