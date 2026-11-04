import { inventoryPageContext } from "@/lib/inventory/page-context";
import { listInventory } from "@/lib/inventory/queries";
import { categoryLabels } from "@/lib/inventory/categories";
import { ProductTable } from "@/components/inventory/product-table";
import { ListFilters } from "@/components/ui/list-filters";
import { ProductDialog } from "@/components/inventory/product-dialog";
import { InventoryShell } from "@/components/inventory/inventory-shell";
import { RefreshInventory } from "@/components/inventory/refresh-inventory";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, householdId } = await inventoryPageContext();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : "";
  const lowStock = params.stock === "low";
  const archived = params.archived === "yes";
  const { products, categories, total } = await listInventory(user, householdId, { query, ...(category ? { categoryId: category } : {}), lowStock, archived });
  const labels = new Map(categoryLabels(categories).map((item) => [item.id, item.label]));
  return <div className="reserve-floating-action"><InventoryShell title="Inventario" description="Organiza los productos de tu hogar y controla sus existencias." active="/inventory" action={<div className="flex items-center gap-2"><ListFilters action="/inventory" label="Buscar producto" placeholder="Nombre del producto" query={query} activeFilters={Boolean(category || lowStock || archived)} key={`${query}:${category}:${lowStock}:${archived}`}>
      <div className="stack">
        <div><label htmlFor="filter-category" className="field-label">Categoría y subcategorías</label><select id="filter-category" name="category" className="control" defaultValue={category}><option value="">Todas</option>{categoryLabels(categories).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
        <div><label htmlFor="filter-stock" className="field-label">Existencias</label><select id="filter-stock" name="stock" defaultValue={lowStock ? "low" : "all"} className="control"><option value="all">Todas</option><option value="low">Por reponer</option></select></div>
        <div><label htmlFor="filter-archived" className="field-label">Estado</label><select id="filter-archived" name="archived" defaultValue={archived ? "yes" : "no"} className="control"><option value="no">Activos</option><option value="yes">Archivados</option></select></div>
      </div>
    </ListFilters><ProductDialog householdId={householdId} categories={categories} /></div>}>

    <ProductTable householdId={householdId} products={products} categories={labels} total={total} lowStockOnly={lowStock} archived={archived} />
    <RefreshInventory />
  </InventoryShell></div>;
}
