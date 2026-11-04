import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { latestStock } from "@/lib/inventory/stock-state";
import { StockControls } from "@/components/inventory/stock-controls";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(account)/inventory/actions", () => ({ inventoryAction: vi.fn() }));

function render(quantity: number) {
  return renderToStaticMarkup(createElement(StockControls, { householdId: "household", productId: "product", name: "Arroz", quantity, revision: 0 }));
}

describe("stock quantity controls", () => {
  it("shows the saved quantity with accessible adjustment labels", () => {
    const html = render(3);
    expect(html).toContain('aria-label="3 en casa"');
    expect(html).toContain('aria-label="Restar una unidad de Arroz"');
    expect(html).toContain('aria-label="Sumar una unidad de Arroz"');
    expect(html).not.toContain('disabled=""');
  });

  it("prevents subtracting below zero while keeping addition available", () => {
    const buttons = [...render(0).matchAll(/<button\b[^>]*>/g)].map(([button]) => button);
    expect(buttons[0]).toContain('disabled=""');
    expect(buttons[1]).not.toContain('disabled=""');
  });

  it("prevents adding beyond the safe quantity limit while allowing consumption", () => {
    const buttons = [...render(Number.MAX_SAFE_INTEGER).matchAll(/<button\b[^>]*>/g)].map(([button]) => button);
    expect(buttons[0]).not.toContain('disabled=""');
    expect(buttons[1]).toContain('disabled=""');
  });
});


describe("confirmed stock reconciliation", () => {
  it("uses the server quantity after concurrent changes instead of adding to a stale count", () => {
    expect(latestStock({ quantity: 3, revision: 0 }, { quantity: 11, revision: 2 })).toEqual({ quantity: 11, revision: 2 });
  });

  it("keeps newer page data when an older action response arrives later", () => {
    expect(latestStock({ quantity: 12, revision: 3 }, { quantity: 11, revision: 2 })).toEqual({ quantity: 12, revision: 3 });
  });

  it("does not add stock again when a successful request is retried", () => {
    const confirmed = { quantity: 4, revision: 1 };
    expect(latestStock(confirmed, confirmed)).toEqual(confirmed);
  });

  it("accepts a newer lower quantity after consumption", () => {
    expect(latestStock({ quantity: 4, revision: 1 }, { quantity: 0, revision: 2 })).toEqual({ quantity: 0, revision: 2 });
  });
});
