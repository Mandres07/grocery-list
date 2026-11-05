import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/inventory/page-context", () => ({ inventoryPageContext: vi.fn() }));
vi.mock("@/lib/inventory/queries", () => ({ listInventory: vi.fn(), listInventoryCategories: vi.fn(), listInventoryActivity: vi.fn() }));
vi.mock("@/app/(account)/inventory/actions", () => ({ inventoryAction: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/inventory", useRouter: () => ({ refresh: vi.fn() }) }));

import InventoryPage from "@/app/(account)/inventory/page";
import CategoriesPage from "@/app/(account)/inventory/categories/page";
import ActivityPage from "@/app/(account)/inventory/activity/page";
import { inventoryPageContext } from "@/lib/inventory/page-context";
import { listInventory, listInventoryCategories, listInventoryActivity } from "@/lib/inventory/queries";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(inventoryPageContext).mockResolvedValue({ householdId: "a".repeat(24), user: { id: "b".repeat(24), name: "Ana", email: "ana@example.test", emailVerified: true, sessionVersion: 0 } });
  vi.mocked(listInventory).mockResolvedValue({ products: [], categories: [], total: 0 });
  vi.mocked(listInventoryCategories).mockResolvedValue([]);
  vi.mocked(listInventoryActivity).mockResolvedValue([]);
});

describe("inventory sections", () => {
  it("keeps product creation in a closed, labelled dialog and secondary tools on separate URLs", async () => {
    const html = renderToStaticMarkup(await InventoryPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('href="/inventory/categories"');
    expect(html).toContain('href="/inventory/activity"');
    expect(html.match(/<a[^>]*aria-current="page"[^>]*>([^<]+)/)?.[1]).toBe("Productos");
    expect(html).toContain('aria-label="Agregar producto"');
    expect(html).toContain("action-float-compact");
    expect(html).toContain("reserve-floating-action");
    expect(html).toContain("Buscar producto");
    expect(html).toContain("<dialog");
    expect(html).not.toMatch(/<dialog[^>]*\bopen[ =>]/);
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain("+ Crear categoría…");
    expect(html).not.toContain("Tus categorías");
    expect(html).not.toContain("Actividad reciente");
  });

  it("groups product details and stock controls in a responsive table", async () => {
    vi.mocked(listInventory).mockResolvedValue({ total: 1, categories: [{ id: "c".repeat(24), name: "Despensa", parentId: null }], products: [{ id: "d".repeat(24), name: "Arroz", unit: "paquetes", quantity: 3, revision: 0, categoryId: "c".repeat(24), lowStockThreshold: 1, archived: false }] });
    const html = renderToStaticMarkup(await InventoryPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('class="table-responsive table-compact"');
    expect(html).toContain('<th scope="col">Producto</th>');
    expect(html).toContain('<th scope="col">Categoría</th>');
    expect(html).toContain('scope="row"');
    expect(html).toContain('role="status" class="sr-only"');
    expect(html).toContain('href="/inventory/' + "d".repeat(24) + '"');
    expect(html).toContain("Despensa");
    expect(html).toContain("paquetes");
    expect(html).toContain('aria-label="3 en casa"');
    expect(html).toContain('aria-label="Restar una unidad de Arroz"');
    expect(html).toContain('aria-label="Sumar una unidad de Arroz"');
  });

  it.each([{ quantity: 0, expected: "Sin existencias" }, { quantity: 1, expected: "Por reponer" }])("shows $expected clearly in product rows", async ({ quantity, expected }) => {
    vi.mocked(listInventory).mockResolvedValue({ total: 1, categories: [], products: [{ id: "d".repeat(24), name: "Arroz", unit: "paquetes", quantity, revision: 0, categoryId: null, lowStockThreshold: 1, archived: false }] });
    const html = renderToStaticMarkup(await InventoryPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain(expected + "</span>");
    expect(html).toContain('data-stock-status="' + (quantity === 0 ? "out" : "low") + '"');
    expect(html).toContain("Sin categoría");
    if (quantity === 0) expect(html).toMatch(/aria-label="Restar una unidad de Arroz" disabled/);
  });

  it("labels zero stock without a configured warning", async () => {
    vi.mocked(listInventory).mockResolvedValue({ total: 1, categories: [], products: [{ id: "d".repeat(24), name: "Arroz", unit: "paquetes", quantity: 0, revision: 0, categoryId: null, lowStockThreshold: null, archived: false }] });
    const html = renderToStaticMarkup(await InventoryPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Sin existencias</span>");
    expect(html).toContain("Por comprar primero");
    expect(html).not.toContain("Disponible");
  });

  it("keeps archived quantities visible without offering stock changes", async () => {
    vi.mocked(listInventory).mockResolvedValue({ total: 1, categories: [], products: [{ id: "d".repeat(24), name: "Arroz", unit: "paquetes", quantity: 3, revision: 0, categoryId: null, lowStockThreshold: 1, archived: true }] });
    const html = renderToStaticMarkup(await InventoryPage({ searchParams: Promise.resolve({ archived: "yes" }) }));
    expect(html).toContain("Abre el producto para restaurarlo");
    expect(html).toContain("Archivado</span>");
    expect(html).not.toContain("Por comprar primero");
    expect(html).not.toContain("Sin existencias");
    expect(html).toContain('aria-label="3 en casa"');
    expect(html).not.toContain('aria-label="Sumar una unidad de Arroz"');
  });

  it("keeps search and filtering in a closed header dialog with URL-backed values", async () => {
    const html = renderToStaticMarkup(await InventoryPage({ searchParams: Promise.resolve({ q: "Arroz", stock: "low" }) }));
    expect(html).toContain('aria-label="Buscar y filtrar · Filtros activos"');
    expect(html).toContain('action="/inventory" method="get"');
    expect(html).toContain('name="q" value="Arroz"');
    expect(html).toContain('<option value="low" selected="">');
    expect(html).toContain("Aplicar filtros");
    expect(html).toContain("Limpiar filtros");
    expect(html).not.toMatch(/<dialog[^>]*\bopen[ =>]/);
    expect(html).not.toContain("filter-toolbar");
    expect(listInventory).toHaveBeenCalledWith(expect.anything(), expect.anything(), { query: "Arroz", lowStock: true, archived: false });
  });

  it("renders category management independently of the product form", async () => {
    const html = renderToStaticMarkup(await CategoriesPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('aria-label="Agregar categoría"');
    expect(html).toContain("action-float-compact");
    expect(html).toContain("reserve-floating-action");
    expect(html).toContain("Agregar categoría");
    expect(html).toContain("Buscar categoría");
    expect(html).toContain("Solo categorías principales");
    expect(html.match(/<a[^>]*aria-current="page"[^>]*>([^<]+)/)?.[1]).toBe("Categorías");
    expect(html).toContain("<dialog");
    expect(html).not.toMatch(/<dialog[^>]*\bopen[ =>]/);
    expect(html).not.toContain("Nombre del producto");
  });

  it("keeps compact category icon actions labelled for each category", async () => {
    vi.mocked(listInventoryCategories).mockResolvedValue([{ id: "c".repeat(24), name: "Despensa", parentId: null }]);
    const html = renderToStaticMarkup(await CategoriesPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('aria-label="Editar Despensa"');
    expect(html).toContain('aria-label="Eliminar Despensa"');
    expect(html).toContain("Eliminar categoría vacía");
    expect(html.match(/aria-label="Agregar categoría"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Cerrar formulario"');
  });

  it("keeps activity details and eligible undo commands in the compact feed", async () => {
    vi.mocked(listInventoryActivity).mockResolvedValue([{ id: "c".repeat(24), productId: "d".repeat(24), productName: "Arroz", actorName: "Ana", delta: 1, reason: "receipt", quantityBefore: 2, quantityAfter: 3, createdAt: "2026-11-04T12:00:00.000Z", canUndo: true }]);
    const html = renderToStaticMarkup(await ActivityPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Arroz");
    expect(html).toContain("+1");
    expect(html).toContain("Entrada · Ana");
    expect(html).toContain('dateTime="2026-11-04T12:00:00.000Z"');
    expect(html).toContain('aria-label="Deshacer movimiento de Arroz"');
    expect(html).toContain('name="kind" value="undo-stock"');
    expect(html).toContain('name="movementId" value="' + "c".repeat(24) + '"');
    vi.mocked(listInventoryActivity).mockResolvedValue([{ id: "c".repeat(24), productId: "d".repeat(24), productName: "Arroz", actorName: "Ana", delta: -1, reason: "undo", quantityBefore: 3, quantityAfter: 2, createdAt: null, canUndo: false }]);
    expect(renderToStaticMarkup(await ActivityPage({ searchParams: Promise.resolve({}) }))).not.toContain('name="kind" value="undo-stock"');
  });

  it("shows activity filters in the shared modal and passes normalized values to the query", async () => {
    const html = renderToStaticMarkup(await ActivityPage({ searchParams: Promise.resolve({ q: " Arroz ", person: " Ana ", from: "2026-11-01", to: "2026-11-04" }) }));
    expect(html).toContain('aria-label="Buscar y filtrar · Filtros activos"');
    expect(html).toContain('action="/inventory/activity" method="get"');
    expect(html).toContain("Persona responsable");
    expect(html).toContain('name="from" value="2026-11-01"');
    expect(html).toContain("No hay movimientos que coincidan");
    expect(listInventoryActivity).toHaveBeenCalledWith(expect.anything(), expect.anything(), undefined, { query: "Arroz", person: "Ana", from: "2026-11-01", to: "2026-11-04" });
  });

  it("shows invalid date range feedback without loading misleading activity", async () => {
    const html = renderToStaticMarkup(await ActivityPage({ searchParams: Promise.resolve({ from: "2026-11-05", to: "2026-11-01" }) }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("La fecha inicial no puede ser posterior");
    expect(listInventoryActivity).not.toHaveBeenCalled();
  });

  it("shows activity directly instead of nesting it below the inventory", async () => {
    const html = renderToStaticMarkup(await ActivityPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Todavía no hay cambios");
    expect(html.match(/<a[^>]*aria-current="page"[^>]*>([^<]+)/)?.[1]).toBe("Actividad");
    expect(html).not.toContain("<details");
    expect(html).not.toContain('name="kind" value="create-product"');
  });
});
