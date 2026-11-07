import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { inventoryPage, inventoryPagination } from "@/lib/inventory/pagination";
import { InventoryPagination } from "@/components/inventory/inventory-pagination";

describe("inventory pagination", () => {
  it.each([undefined, null, "", "-1", "1.5", "1e3", ["2"], Infinity, Number.MAX_SAFE_INTEGER + 1])("defaults invalid page %j to one", (value) => {
    expect(inventoryPage(value)).toBe(1);
  });
  it("uses 25-item pages and clamps requests to available results", () => {
    expect(inventoryPagination(51, "2")).toEqual({ page: 2, pageCount: 3, offset: 25 });
    expect(inventoryPagination(51, "999")).toEqual({ page: 3, pageCount: 3, offset: 50 });
    expect(inventoryPagination(0, "999")).toEqual({ page: 1, pageCount: 1, offset: 0 });
  });
  it("preserves all filters, marks the current page, and uses non-prefetched navigation", () => {
    const html = renderToStaticMarkup(createElement(InventoryPagination, { page: 2, pageCount: 5, total: 101, filters: { q: "Arroz & sal", category: "category", stock: "low", archived: "yes" } }));
    expect(html).toContain("26–50 de 101 productos");
    expect(html).toContain('aria-label="Páginas del inventario"');
    expect(html).toContain('aria-label="Página 2" aria-current="page"');
    expect(html).toContain('q=Arroz+%26+sal&amp;category=category&amp;stock=low&amp;archived=yes&amp;page=3');
    expect(html).not.toContain("page=1");
  });
  it("disables unavailable directions and omits controls on a single page", () => {
    const first = renderToStaticMarkup(createElement(InventoryPagination, { page: 1, pageCount: 2, total: 26, filters: {} }));
    expect(first).toContain('<button type="button" disabled="" class="action-secondary">Anterior</button>');
    const last = renderToStaticMarkup(createElement(InventoryPagination, { page: 2, pageCount: 2, total: 26, filters: {} }));
    expect(last).toContain("26–26 de 26 productos");
    expect(last).toContain('<button type="button" disabled="" class="action-secondary">Siguiente</button>');
    expect(renderToStaticMarkup(createElement(InventoryPagination, { page: 1, pageCount: 1, total: 0, filters: {} }))).toBe("");
  });
});
