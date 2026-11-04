import { describe, expect, it } from "vitest";
import { stockStatus, STOCK_LABELS, compareStockProducts } from "@/lib/inventory/stock-status";

describe("shopping urgency", () => {
  it.each([null, 0, 3])("marks zero stock as out regardless of threshold %s", (threshold) => {
    expect(stockStatus(0, threshold)).toBe("out");
    expect(STOCK_LABELS.out).toBe("Sin existencias");
  });
  it("includes the warning boundary and quantities below it", () => {
    expect(stockStatus(3, 3)).toBe("low");
    expect(stockStatus(1, 3)).toBe("low");
    expect(STOCK_LABELS.low).toBe("Por reponer");
  });
  it("leaves stocked products with no warning or a zero threshold available", () => {
    expect(stockStatus(4, 3)).toBe("available");
    expect(stockStatus(1, null)).toBe("available");
    expect(stockStatus(1, 0)).toBe("available");
  });
  it("keeps archived products out of buying status", () => {
    expect(stockStatus(0, 3, true)).toBe("archived");
    expect(stockStatus(1, 3, true)).toBe("archived");
  });
  it("orders urgency first, then names and stable IDs", () => {
    const records = [
      { id: "b", name: "Arroz", quantity: 5, lowStockThreshold: 1, archived: false },
      { id: "c", name: "Z agotado", quantity: 0, lowStockThreshold: null, archived: false },
      { id: "a", name: "Arroz", quantity: 5, lowStockThreshold: 1, archived: false },
      { id: "d", name: "Z bajo", quantity: 2, lowStockThreshold: 2, archived: false },
    ];
    expect([...records].sort(compareStockProducts).map((item) => item.id)).toEqual(["c", "d", "a", "b"]);
    const replenished = records.map((item) => item.id === "c" ? { ...item, quantity: 4 } : item);
    expect(replenished.sort(compareStockProducts).map((item) => item.id)).toEqual(["d", "a", "b", "c"]);
  });
});
