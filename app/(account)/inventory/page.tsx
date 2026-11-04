import Link from "next/link";
import { randomUUID } from "node:crypto";
import { inventoryPageContext } from "@/lib/inventory/page-context";
import { listInventory, listInventoryActivity } from "@/lib/inventory/queries";
import { categoryLabels } from "@/lib/inventory/categories";
import { ActionForm } from "@/components/ui/action-form";
import { RecordRow } from "@/components/ui/record-row";
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
    <Link href="/household" className="action-secondary mb-4">Mi hogar</Link>
    <h1 className="heading-title">Lo que hay en casa</h1>
    <p className="mt-3 text-sm leading-6 text-muted">Productos guardados y compartidos con tu hogar. Cada cambio de existencias queda en la actividad.</p>
    <RefreshInventory />
    <details className="disclosure mt-4" open={total === 0 && !query && !category && !lowStock && !archived}>
      <summary className="action-primary cursor-pointer list-none">Agregar producto</summary>
      <ActionForm action={inventoryAction} requestId={randomUUID()} hiddenFields={{ kind: "create-product", householdId }} submitLabel="Guardar producto" resetOnSuccess><ProductFields categories={categories} /></ActionForm>
    </details>
    <form action="/inventory" className="filter-toolbar" key={`${query}:${category}:${lowStock}:${archived}`}>
      <FormField label="Buscar producto" name="q" type="search" placeholder="Nombre del producto" maxLength={160} defaultValue={query} />
      <button className="action-secondary">Buscar</button>
      <details className="disclosure" open={Boolean(category || lowStock || archived)}>
        <summary className="disclosure-trigger">Más filtros{(category || lowStock || archived) && " · Activos"}</summary>
        <div className="grid gap-3 pb-3 sm:grid-cols-3">
          <div><label htmlFor="filter-category" className="field-label">Categoría y subcategorías</label><select id="filter-category" name="category" className="control" defaultValue={category}><option value="">Todas</option>{categoryLabels(categories).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
          <div><label htmlFor="filter-stock" className="field-label">Existencias</label><select id="filter-stock" name="stock" defaultValue={lowStock ? "low" : "all"} className="control"><option value="all">Todas</option><option value="low">Por reponer</option></select></div>
          <div><label htmlFor="filter-archived" className="field-label">Estado</label><select id="filter-archived" name="archived" defaultValue={archived ? "yes" : "no"} className="control"><option value="no">Activos</option><option value="yes">Archivados</option></select></div>
        </div>
        <div className="flex flex-wrap gap-2 pb-3"><button className="action-secondary">Aplicar filtros</button><Link href="/inventory" className="action-secondary">Limpiar filtros</Link></div>
      </details>
    </form>
    <p className="mt-4 text-xs text-muted">{total} {total === 1 ? "producto encontrado" : "productos encontrados"}{total > 100 && ". Se muestran los primeros 100; usa la búsqueda para encontrar el resto."}</p>
    {products.length === 0 ? <p className="notice mt-4">No hay productos en esta vista. Agrega el primero o cambia los filtros.</p> : <ul className="record-list mt-2">{products.map((product) => <li key={product.id}>
      <RecordRow title={<Link href={`/inventory/${product.id}`} className="underline underline-offset-4">{product.name}</Link>}
        description={<>{product.categoryId ? labels.get(product.categoryId) : "Sin categoría"} · {product.unit}</>}
        status={product.lowStockThreshold !== null && product.quantity <= product.lowStockThreshold ? product.quantity === 0 ? "Sin existencias" : "Por reponer" : undefined}>
        {product.archived ? <p className="text-xs text-muted">Archivado · {product.quantity} {product.unit}. Abre para restaurar.</p> : <StockControls householdId={householdId} productId={product.id} name={product.name} quantity={product.quantity} revision={product.revision} />}
      </RecordRow>
    </li>)}</ul>}
    <CategoryManager householdId={householdId} categories={categories} />
    <ActivityList householdId={householdId} movements={movements} />
  </>;
}
