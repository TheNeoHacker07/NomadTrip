import { describe, expect, it } from "vitest";
import { buildCsv, csvCell, CSV_BOM } from "./csv";

describe("csvCell", () => {
  it("leaves plain values alone and renders null as empty", () => {
    expect(csvCell("abc")).toBe("abc");
    expect(csvCell(42)).toBe("42");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes commas, quotes and line breaks, doubling inner quotes", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell("a\r\nb")).toBe('"a\r\nb"');
  });

  it.each(["=1+1", "+1", "-1", "@SUM(A1)", "\tx", "\rx"])("neutralises formula start %j", (v) => {
    expect(csvCell(v).replace(/^"/, "").startsWith("'")).toBe(true);
  });

  it("guards leading whitespace before a formula and a leading newline", () => {
    expect(csvCell(" =1+1")).toBe("' =1+1");
    expect(csvCell("\n=1")).toBe(`"'\n=1"`);
  });

  it("keeps plain phone numbers usable but guards formulas starting with +", () => {
    expect(csvCell("+996 555 123456")).toBe("+996 555 123456");
    expect(csvCell("+SUM(1)")).toBe("'+SUM(1)");
  });

  it("protects and quotes at once", () => {
    expect(csvCell('=HYPERLINK("http://x","y")')).toBe(`"'=HYPERLINK(""http://x"",""y"")"`);
  });

  it("does not touch formula characters that are not leading", () => {
    expect(csvCell("a=b")).toBe("a=b");
    expect(csvCell("Anna-Maria")).toBe("Anna-Maria");
  });
});

describe("buildCsv", () => {
  it("starts with a BOM and uses CRLF record terminators", () => {
    const out = buildCsv(["ref", "name"], [["NT-AAAA2222", "Айдар, Ж."]]);
    expect(out.startsWith(CSV_BOM)).toBe(true);
    expect(out.slice(1)).toBe('ref,name\r\nNT-AAAA2222,"Айдар, Ж."\r\n');
  });

  it("emits just the header when there are no rows", () => {
    expect(buildCsv(["a"], [])).toBe(CSV_BOM + "a\r\n");
  });
});
