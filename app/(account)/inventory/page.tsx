import Link from "next/link";
import { bulkProductMessage, parseBulkResult } from "@/lib/inventory/bulk-result";
import { inventoryPage } from "@/lib/inventory/pagination";
import { InventoryPagination } from "@/components/inventory/inventory-pagination";
import { SelectControl } from "@/components/ui/select-control";
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
  const completion = parseBulkResult(params.added, params.omitted);
  const requestedPage = inventoryPage(params.page);
  const { products, categories, total, page, pageCount } = await listInventory(user, householdId, { query, ...(category ? { categoryId: category } : {}), lowStock, archived, page: requestedPage });
  const labels = new Map(categoryLabels(categories).map((item) => [item.id, item.label]));
  return <div className="reserve-floating-action"><InventoryShell title="Inventario" description="Organiza los productos de tu hogar y controla sus existencias." active="/inventory" action={<div className="flex items-center gap-2"><ListFilters action="/inventory" label="Buscar producto" placeholder="Nombre del producto" query={query} activeFilters={Boolean(category || lowStock || archived)} key={`${query}:${category}:${lowStock}:${archived}`}>
      <div className="stack">
        <div><label htmlFor="filter-category" className="field-label">Categoría y subcategorías</label><SelectControl id="filter-category" name="category" defaultValue={category}><option value="">Todas</option>{categoryLabels(categories).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</SelectControl></div>
        <div><label htmlFor="filter-stock" className="field-label">Existencias</label><SelectControl id="filter-stock" name="stock" defaultValue={lowStock ? "low" : "all"}><option value="all">Todas</option><option value="low">Por reponer</option></SelectControl></div>
        <div><label htmlFor="filter-archived" className="field-label">Estado</label><SelectControl id="filter-archived" name="archived" defaultValue={archived ? "yes" : "no"}><option value="no">Activos</option><option value="yes">Archivados</option></SelectControl></div>
      </div>
    </ListFilters><ProductDialog householdId={householdId} categories={categories} /></div>}>

    {completion && <div role="status" className={`notice mt-4${completion.omitted > 0 ? " notice-warning" : ""}`}>
      <p>{bulkProductMessage(completion.added, completion.omitted)}</p>
      {completion.omitted > 0 && <p className="mt-1 text-sm">Los productos omitidos ya existen en tu hogar, incluidos los archivados, o se repiten en la lista. Sus existencias no cambiaron.</p>}
      <Link href="/inventory" className="action-link mt-2">Cerrar aviso</Link>
    </div>}
    <ProductTable key={JSON.stringify([householdId, query, category, lowStock, archived, page])} householdId={householdId} products={products} categories={labels} total={total} lowStockOnly={lowStock} archived={archived} />
    <InventoryPagination page={page} pageCount={pageCount} total={total} filters={{ ...(query ? { q: query } : {}), ...(category ? { category } : {}), ...(lowStock ? { stock: "low" } : {}), ...(archived ? { archived: "yes" } : {}) }} />
    <RefreshInventory />
  </InventoryShell></div>;
}
