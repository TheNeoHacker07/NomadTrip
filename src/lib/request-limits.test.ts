import { describe, expect, it } from "vitest";
import { createInquiryGuard, createLookupGuard } from "./request-limits";

describe("lookup guard", () => {
  it("limits per reference even without an IP, and other references are unaffected", () => {
    const g = createLookupGuard({ now: () => 0 });
    for (let i = 0; i < 10; i++) expect(g.attempt("NT-AAAAAAAA", null)).toBe(true);
    expect(g.attempt("NT-AAAAAAAA", null)).toBe(false);
    expect(g.attempt("NT-BBBBBBBB", null)).toBe(true);
  });
  it("limits per IP across references when the IP is known", () => {
    const g = createLookupGuard({ now: () => 0 });
    for (let i = 0; i < 10; i++) expect(g.attempt(`NT-REF${i}`, "1.1.1.1")).toBe(true);
    expect(g.attempt("NT-OTHER", "1.1.1.1")).toBe(false);
    expect(g.attempt("NT-OTHER", "2.2.2.2")).toBe(true);
  });
});

describe("inquiry guard", () => {
  it("allows 5 stored inquiries per IP", () => {
    const g = createInquiryGuard({ now: () => 0 });
    for (let i = 0; i < 5; i++) {
      expect(g.allowed("1.1.1.1")).toBe(true);
      g.record("1.1.1.1", false);
    }
    expect(g.allowed("1.1.1.1")).toBe(false);
    expect(g.allowed("2.2.2.2")).toBe(true);
  });
  it("applies a global cap of 30 across visitors, with or without IPs", () => {
    const g = createInquiryGuard({ now: () => 0 });
    for (let i = 0; i < 30; i++) {
      expect(g.allowed(i % 2 ? null : `10.0.0.${i}`)).toBe(true);
      g.record(i % 2 ? null : `10.0.0.${i}`, false);
    }
    expect(g.allowed("9.9.9.9")).toBe(false);
    expect(g.allowed(null)).toBe(false);
  });
  it("honeypot hits consume only the global quota", () => {
    const g = createInquiryGuard({ now: () => 0 });
    for (let i = 0; i < 30; i++) g.record("1.1.1.1", true);
    expect(g.allowed("1.1.1.1")).toBe(false);
    const g2 = createInquiryGuard({ now: () => 0 });
    for (let i = 0; i < 10; i++) g2.record("1.1.1.1", true);
    expect(g2.allowed("1.1.1.1")).toBe(true); // IP quota untouched
  });
  it("validation failures (nothing recorded) don't consume quota", () => {
    const g = createInquiryGuard({ now: () => 0 });
    for (let i = 0; i < 100; i++) expect(g.allowed("1.1.1.1")).toBe(true);
  });
});
