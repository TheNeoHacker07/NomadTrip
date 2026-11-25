/**
 * Whole years of age on `onDate`, from ISO dates (`YYYY-MM-DD`). Returns null for malformed input
 * or a date of birth after `onDate`.
 */
export function ageOn(dob: string, onDate: string): number | null {
  const re = /^(\d{4})-(\d{2})-(\d{2})$/;
  const b = re.exec(dob);
  const d = re.exec(onDate);
  if (!b || !d) return null;
  const [by, bm, bd] = [Number(b[1]), Number(b[2]), Number(b[3])];
  const [dy, dm, dd] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const valid = (y: number, m: number, day: number) => {
    const t = new Date(Date.UTC(y, m - 1, day));
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === day;
  };
  if (!valid(by, bm, bd) || !valid(dy, dm, dd)) return null;
  if (dob > onDate) return null;
  let age = dy - by;
  if (dm < bm || (dm === bm && dd < bd)) age -= 1;
  return age;
}
