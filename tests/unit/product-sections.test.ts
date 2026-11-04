import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/inventory/page-context", () => ({ inventoryPageContext: vi.fn() }));
vi.mock("@/lib/inventory/queries", () => ({ getInventoryProduct: vi.fn(), listInventoryCategories: vi.fn(), listInventoryActivity: vi.fn() }));
vi.mock("@/app/(account)/inventory/actions", () => ({ inventoryAction: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); }, useRouter: () => ({ refresh: vi.fn() }) }));
import ProductPage from "@/app/(account)/inventory/[productId]/page";
import { inventoryPageContext } from "@/lib/inventory/page-context";
import { getInventoryProduct, listInventoryCategories, listInventoryActivity } from "@/lib/inventory/queries";

const user = { id: "a".repeat(24), name: "Ana", email: "ana@example.test", emailVerified: true, sessionVersion: 0 };
const householdId = "b".repeat(24);
const productId = "c".repeat(24);
const product = { id: productId, name: "Arroz", unit: "bolsas", quantity: 3, revision: 2, categoryId: null, lowStockThreshold: 1, archived: false };
async function render(tab?: string | string[]) {
  return renderToStaticMarkup(await ProductPage({ params: Promise.resolve({ productId }), searchParams: Promise.resolve({ tab }) }));
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(inventoryPageContext).mockResolvedValue({ user, householdId });
  vi.mocked(getInventoryProduct).mockResolvedValue(product);
  vi.mocked(listInventoryCategories).mockResolvedValue([]);
  vi.mocked(listInventoryActivity).mockResolvedValue([]);
});

describe("product sections", () => {
  it.each([
    { quantity: 0, archived: false, label: "Sin existencias" },
    { quantity: 1, archived: false, label: "Por reponer" },
    { quantity: 3, archived: false, label: "Disponible" },
    { quantity: 0, archived: true, label: "Archivado" },
  ])("shows the product summary status: $label", async ({ quantity, archived, label }) => {
    vi.mocked(getInventoryProduct).mockResolvedValue({ ...product, quantity, archived });
    const html = await render();
    const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
    expect(header).toContain('aria-label="Volver al inventario"');
    expect(header).toContain("Arroz");
    expect(header).toContain(`${quantity}</span> bolsas en casa`);
    expect(header).toContain(label);
  });
  it("defaults to one edit panel with shared navigation and versioned form data", async () => {
    const html = await render();
    expect(html).toContain('aria-label="Secciones del producto"');
    expect(html).toContain('href="/inventory/' + productId + '?tab=stock"');
    expect(html).toContain('name="kind" value="edit-product"');
    expect(html).toContain('name="revision" value="2"');
    expect(html).toContain('name="householdId" value="' + householdId + '"');
    expect(html).not.toContain('value="correct-stock"');
    expect(html).not.toContain('value="archive-product"');
    expect(html).not.toContain("Actividad reciente");
    expect(listInventoryActivity).not.toHaveBeenCalled();
  });
  it("shows only the correction form on the stock tab", async () => {
    const html = await render("stock");
    expect(html).toContain('name="kind" value="correct-stock"');
    expect(html).toContain('name="quantity" value="3"');
    expect(html).toContain('name="revision" value="2"');
    expect(html).not.toContain('value="edit-product"');
    expect(listInventoryCategories).not.toHaveBeenCalled();
    expect(listInventoryActivity).not.toHaveBeenCalled();
  });
  it("loads only the selected product activity directly", async () => {
    const html = await render("activity");
    expect(listInventoryActivity).toHaveBeenCalledWith(user, householdId, productId);
    expect(html).toContain("Todavía no hay cambios");
    expect(html).not.toContain("<details");
    expect(html).not.toContain("Guardar producto");
    expect(listInventoryCategories).not.toHaveBeenCalled();
  });
  it.each([false, true])("offers the correct management command (archived: %s)", async (archived) => {
    vi.mocked(getInventoryProduct).mockResolvedValue({ ...product, archived });
    const html = await render("manage");
    expect(html).toContain(`name="kind" value="${archived ? "restore-product" : "archive-product"}"`);
    expect(html).not.toContain('value="correct-stock"');
    expect(html).not.toContain('value="edit-product"');
  });
  it.each(["unknown", ["stock", "activity"]])("falls back safely for an invalid tab %s", async (tab) => {
    expect(await render(tab)).toContain('name="kind" value="edit-product"');
  });
  it("keeps archived details and stock read-only with a path to restoration", async () => {
    vi.mocked(getInventoryProduct).mockResolvedValue({ ...product, archived: true });
    for (const tab of ["details", "stock"]) {
      const html = await render(tab);
      expect(html).not.toContain('value="edit-product"');
      expect(html).not.toContain('value="correct-stock"');
      expect(html).toContain('href="/inventory/' + productId + '?tab=manage"');
      expect(html).toContain("Restaurar producto");
    }
  });
  it("keeps the missing-product response before loading tab data", async () => {
    vi.mocked(getInventoryProduct).mockResolvedValue(null);
    await expect(render("activity")).rejects.toThrow("not-found");
    expect(listInventoryActivity).not.toHaveBeenCalled();
    expect(listInventoryCategories).not.toHaveBeenCalled();
  });
});
