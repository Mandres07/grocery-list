import { describe, expect, it } from "vitest";
import { wholeNumber, optionalQuantity, inventoryName, inventoryRequestId } from "@/lib/inventory/validation";
import { categoryLabels, descendantCategoryIds } from "@/lib/inventory/categories";

describe("inventory inputs and category navigation", () => {
  it("accepts zero and safe whole quantities, with optional thresholds", () => {
    expect(wholeNumber("0")).toBe(0);
    expect(wholeNumber(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    expect(optionalQuantity("")).toBeNull();
    expect(optionalQuantity("0")).toBe(0);
    for (const value of ["", null, "-1", "1.5", "1e3", "NaN", String(Number.MAX_SAFE_INTEGER + 1)]) expect(() => wholeNumber(value)).toThrow("entera");
  });

  it("validates names and stable request identifiers", () => {
    expect(inventoryName(" Arroz ")).toBe("Arroz");
    for (const value of [null, " ", "a".repeat(161)]) expect(() => inventoryName(value)).toThrow();
    expect(inventoryRequestId("valid-request-123")).toBe("valid-request-123");
    for (const value of ["short", "a".repeat(129), "../../invalid"]) expect(() => inventoryRequestId(value)).toThrow();
  });

  it("builds category paths and includes descendants without looping on bad historical data", () => {
    const categories = [{ id: "a", name: "Alimentos", parentId: null }, { id: "b", name: "Despensa", parentId: "a" }, { id: "c", name: "Arroz", parentId: "b" }, { id: "d", name: "Limpieza", parentId: null }];
    expect(categoryLabels(categories).find((item) => item.id === "c")!.label).toBe("Alimentos / Despensa / Arroz");
    expect(descendantCategoryIds(categories, "a")).toEqual(["a", "b", "c"]);
    expect(categoryLabels([{ id: "a", name: "A", parentId: "b" }, { id: "b", name: "B", parentId: "a" }])).toHaveLength(2);
  });
});
