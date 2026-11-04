import Link from "next/link";
import { randomUUID } from "node:crypto";
import { inventoryPageContext } from "@/lib/inventory/page-context";
import { listInventory, listInventoryActivity } from "@/lib/inventory/queries";
import { categoryLabels } from "@/lib/inventory/categories";
import { ActionForm } from "@/components/ui/action-form";
import { FormField } from "@/components/ui/form-field";
import { ProductFields } from "@/components/inventory/product-fields";
import { CategoryManager } from "@/components/inventory/category-manager";
import { ActivityList } from "@/components/inventory/activity-list";
import { StockControls } from "@/components/inventory/stock-controls";
import { RefreshInventory } from "@/components/inventory/refresh-inventory";
import { inventoryAction } from "./actions";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, householdId } = await inventoryPageContext();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : "";
  const lowStock = params.stock === "low";
  const archived = params.archived === "yes";
  const [{ products, categories, total }, movements] = await Promise.all([
    listInventory(user, householdId, { query, ...(category ? { categoryId: category } : {}), lowStock, archived }),
    listInventoryActivity(user, householdId),
  ]);
  const labels = new Map(categoryLabels(categories).map((item) => [item.id, item.label]));
  return <>
    <Link href="/household" className="button-secondary mb-6">Mi hogar</Link>
    <h1 className="page-title">Lo que hay en casa</h1>
    <p className="mt-3 text-sm leading-6 text-muted">Productos guardados y compartidos con tu hogar. Cada cambio de existencias queda en la actividad.</p>
    <RefreshInventory />
    <details className="inventory-card mt-6" open={total === 0 && !query && !category && !lowStock && !archived}>
      <summary className="min-h-12 cursor-pointer font-semibold">Agregar producto</summary>
      <ActionForm action={inventoryAction} requestId={randomUUID()} hiddenFields={{ kind: "create-product", householdId }} submitLabel="Guardar producto" resetOnSuccess><ProductFields categories={categories} /></ActionForm>
    </details>
    <CategoryManager householdId={householdId} categories={categories} />
    <form action="/inventory" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" key={`${query}:${category}:${lowStock}:${archived}`}>
      <FormField label="Buscar producto" name="q" type="search" maxLength={160} defaultValue={query} />
      <div><label htmlFor="filter-category" className="form-label">Categoría y subcategorías</label><select id="filter-category" name="category" className="form-input" defaultValue={category}><option value="">Todas</option>{categoryLabels(categories).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
      <div><label htmlFor="filter-stock" className="form-label">Existencias</label><select id="filter-stock" name="stock" defaultValue={lowStock ? "low" : "all"} className="form-input"><option value="all">Todas</option><option value="low">Por reponer</option></select></div>
      <div><label htmlFor="filter-archived" className="form-label">Estado</label><select id="filter-archived" name="archived" defaultValue={archived ? "yes" : "no"} className="form-input"><option value="no">Activos</option><option value="yes">Archivados</option></select></div>
      <button className="button-secondary">Aplicar filtros</button><Link href="/inventory" className="button-secondary">Limpiar filtros</Link>
    </form>
    <p className="mt-6 text-sm text-muted">{total} {total === 1 ? "producto encontrado" : "productos encontrados"}{total > 100 && ". Se muestran los primeros 100; usa la búsqueda para encontrar el resto."}</p>
    {products.length === 0 ? <p className="notice mt-4">No hay productos en esta vista. Agrega el primero o cambia los filtros.</p> : <ul className="mt-4 grid gap-4 sm:grid-cols-2">{products.map((product) => <li key={product.id} className="inventory-card">
      <Link href={`/inventory/${product.id}`} className="text-lg font-semibold underline underline-offset-4">{product.name}</Link>
      <p className="mt-2 text-sm text-muted">{product.categoryId ? labels.get(product.categoryId) : "Sin categoría"} · {product.unit}</p>
      {product.lowStockThreshold !== null && product.quantity <= product.lowStockThreshold && <p className="mt-2 text-sm font-semibold text-warning">{product.quantity === 0 ? "Sin existencias" : "Por reponer"}</p>}
      {product.archived ? <p className="mt-4 text-sm text-muted">Archivado · {product.quantity} {product.unit}. Abre el producto para restaurarlo.</p> : <StockControls householdId={householdId} productId={product.id} name={product.name} quantity={product.quantity} />}
    </li>)}</ul>}
    <ActivityList householdId={householdId} movements={movements} />
  </>;
}
