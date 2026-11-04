import { describe, expect, it } from "vitest";
import { literalNamePattern, parseActivityFilters } from "@/lib/inventory/activity-filters";

describe("activity filtering input", () => {
  it("normalizes names and preserves inclusive Panama calendar boundaries", () => {
    const parsed = parseActivityFilters({ query: " Arroz ", person: " Ana ", from: "2026-11-04", to: "2026-11-04" });
    expect(parsed.error).toBeNull();
    expect(parsed.filters).toEqual({ query: "Arroz", person: "Ana", from: "2026-11-04", to: "2026-11-04" });
    expect(parsed.dateRange.$gte?.toISOString()).toBe("2026-11-04T05:00:00.000Z");
    expect(parsed.dateRange.$lt?.toISOString()).toBe("2026-11-05T05:00:00.000Z");
  });
  it("accepts one-sided dates and leap days", () => {
    expect(parseActivityFilters({ from: "2024-02-29" }).dateRange).toEqual({ $gte: new Date("2024-02-29T05:00:00Z") });
    expect(parseActivityFilters({ to: "2026-12-31" }).dateRange).toEqual({ $lt: new Date("2027-01-01T05:00:00Z") });
  });
  it.each(["2026-02-29", "2026-04-31", "2026-13-01", "2026-11-04 extra", "0000-01-01", "not-a-date"])("rejects invalid calendar input %s", (from) => {
    const parsed = parseActivityFilters({ from });
    expect(parsed.error).toContain("día válido");
    expect(parsed.dateRange).toEqual({});
    expect(parsed.filters.from).toBe("");
  });
  it("rejects reversed ranges", () => {
    const parsed = parseActivityFilters({ from: "2026-11-05", to: "2026-11-04" });
    expect(parsed.error).toContain("posterior");
    expect(parsed.dateRange).toEqual({});
  });
  it("ignores non-string fields and bounds name search length", () => {
    const parsed = parseActivityFilters({ query: ["not", "a string"], person: "a".repeat(200), from: { $gt: "" } });
    expect(parsed.filters.query).toBe("");
    expect(parsed.filters.person).toHaveLength(160);
    expect(parsed.dateRange).toEqual({});
  });
  it("treats regex metacharacters as literal name text", () => {
    const pattern = literalNamePattern("Arroz [integral] (casa) .*");
    const matcher = new RegExp(pattern.$regex, pattern.$options);
    expect(matcher.test("ARROZ [integral] (casa) .* familiar")).toBe(true);
    expect(matcher.test("Arroz integral casa cualquier cosa")).toBe(false);
  });
});
