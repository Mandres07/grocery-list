import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { shoppingQuantity, receiptSelection } from "@/lib/shopping/mutations";
import { latestShopping } from "@/lib/shopping/state";

vi.mock("@/lib/inventory/page-context", () => ({ inventoryPageContext: vi.fn() }));
vi.mock("@/lib/shopping/queries", () => ({ listShoppingItems: vi.fn(), shoppingProductOptions: vi.fn() }));
vi.mock("@/app/(account)/shopping/actions", () => ({ shoppingAction: vi.fn(), searchShoppingProducts: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import ShoppingPage from "@/app/(account)/shopping/page";
import { inventoryPageContext } from "@/lib/inventory/page-context";
import { listShoppingItems, shoppingProductOptions } from "@/lib/shopping/queries";

const householdId = "a".repeat(24);
const actor = { id: "b".repeat(24), name: "Ana", email: "ana@example.test", sessionVersion: 0, emailVerified: true };
const item = { id: "c".repeat(24), productId: "d".repeat(24), name: "Arroz", unit: "bolsas", quantity: 2, revision: 0, status: "pending" as const, receivedQuantity: null, receivedAt: null };
async function render(status = "pending", q?: string) {
  return renderToStaticMarkup(await ShoppingPage({ searchParams: Promise.resolve({ status, q }) }));
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(inventoryPageContext).mockResolvedValue({ user: actor, householdId });
  vi.mocked(listShoppingItems).mockResolvedValue({ items: [item], total: 1, receiptItems: [{ id: item.id, revision: 1, quantity: item.quantity }] });
  vi.mocked(shoppingProductOptions).mockResolvedValue([]);
});

describe("shared shopping list", () => {
  it("shows pending purchases with a labelled toggle and shared add/filter dialogs", async () => {
    const html = await render();
    expect(html).toContain('aria-label="Marcar como comprado: Arroz"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-label="Cantidad de Arroz"');
    expect(html).toContain('min="1"');
    expect(html).not.toContain("Guardar cantidad");
    expect(html).toContain('aria-label="Estado de las compras"');
    expect(html).toContain('href="/shopping?status=purchased"');
    expect(html).toContain("Agregar faltantes");
    expect(html).toContain("Artículo personalizado");
    expect(html).toContain('aria-label="Buscar y filtrar"');
    expect(html).not.toContain('value="receive"');
    expect(listShoppingItems).toHaveBeenCalledWith(actor, householdId, "pending", "");
  });
  it("offers one receipt confirmation for the purchased snapshot", async () => {
    vi.mocked(listShoppingItems).mockResolvedValue({ items: [{ ...item, status: "purchased", revision: 1 }], total: 1, receiptItems: [{ id: item.id, revision: 1, quantity: item.quantity }] });
    const html = await render("purchased");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="Volver a pendientes: Arroz"');
    expect(html).toContain('name="kind" value="receive-batch"');
    expect(html).toContain('name="items"');
    expect(html).not.toContain('aria-label="Cantidad de Arroz"');
    expect(html).toContain("Confirmar recepción");
    expect(html).toContain("confirma toda la compra");
    expect(html).not.toContain('aria-label="Agregar artículo"');
    expect(shoppingProductOptions).not.toHaveBeenCalled();
    expect(html).toContain('href="/shopping?status=purchased">Limpiar filtros');
  });
  it("keeps received history read-only and distinguishes custom receipts", async () => {
    vi.mocked(listShoppingItems).mockResolvedValue({ items: [{ ...item, productId: null, status: "received", revision: 2, receivedQuantity: 3, receivedAt: "2026-11-04T18:00:00.000Z" }], total: 1, receiptItems: [{ id: item.id, revision: 1, quantity: item.quantity }] });
    const html = await render("received");
    expect(html).toContain("Recibido sin modificar inventario");
    expect(html).toContain('dateTime="2026-11-04T18:00:00.000Z"');
    expect(html).not.toContain('value="receive"');
    expect(html).not.toContain('value="delete"');
    expect(html).not.toContain("aria-pressed");
  });
  it("handles an empty filtered list and invalid status safely", async () => {
    vi.mocked(listShoppingItems).mockResolvedValue({ items: [], total: 0, receiptItems: [] });
    const html = await render("invalid", "  Arroz  ");
    expect(listShoppingItems).toHaveBeenCalledWith(actor, householdId, "pending", "Arroz");
    expect(html).toContain("No hay artículos que coincidan");
  });
  it("does not offer bulk receipt of hidden search results", async () => {
    vi.mocked(listShoppingItems).mockResolvedValue({ items: [{ ...item, status: "purchased" }], total: 1, receiptItems: [{ id: item.id, revision: 1, quantity: item.quantity }] });
    const html = await render("purchased", "Arroz");
    expect(html).not.toContain('value="receive-batch"');
    expect(html).toContain("Ver toda la compra para confirmar la recepción");
    expect(listShoppingItems).toHaveBeenCalledOnce();
  });

});

describe("shopping quantities and confirmation ordering", () => {
  it.each([0, -1, 1.5, "1e2", Number.MAX_SAFE_INTEGER + 1])("rejects invalid quantities %s", (quantity) => {
    expect(() => shoppingQuantity(quantity)).toThrow();
  });
  it("accepts positive whole quantities including the safe boundary", () => {
    expect(shoppingQuantity("2")).toBe(2);
    expect(shoppingQuantity(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });
  it("keeps newer shared shopping state when delayed responses arrive", () => {
    const current = { id: item.id, status: "received" as const, revision: 4, quantity: 2 };
    expect(latestShopping(current, { ...current, status: "pending", revision: 3 })).toEqual(current);
    expect(latestShopping(current, { ...current, revision: 5 }).revision).toBe(5);
  });
});

describe("batch receipt selection", () => {
  it.each([null, "bad json", [], [{ id: item.id, revision: 0, quantity: 0 }], [{ id: item.id, revision: -1, quantity: 1 }], [{ id: item.id }], [{ id: item.id, revision: 0, quantity: 1 }, { id: item.id, revision: 0, quantity: 1 }]])("rejects invalid or duplicate selections %j", (value) => {
    expect(() => receiptSelection(value)).toThrow();
  });
  it("normalizes selections in a stable ID order", () => {
    const other = { id: "b".repeat(24), revision: 2, quantity: 3 };
    expect(receiptSelection(JSON.stringify([{ id: item.id, revision: 1, quantity: 2 }, other]))).toEqual([other, { id: item.id, revision: 1, quantity: 2 }]);
  });
});
