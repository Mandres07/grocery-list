import { inventoryPageContext } from "@/lib/inventory/page-context";
import { listInventoryCategories } from "@/lib/inventory/queries";
import { filterCategories, categoryLabels } from "@/lib/inventory/categories";
import { InventoryShell } from "@/components/inventory/inventory-shell";
import { CategoryManager } from "@/components/inventory/category-manager";
import { CategoryDialog } from "@/components/inventory/category-dialog";
import { ListFilters } from "@/components/ui/list-filters";

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ q?: string; parent?: string }> }) {
  const { user, householdId } = await inventoryPageContext();
  const categories = await listInventoryCategories(user, householdId);
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 160) : "";
  const requestedParent = typeof params.parent === "string" ? params.parent : "";
  const parent = requestedParent === "root" || categories.some((category) => category.id === requestedParent) ? requestedParent : "";
  const visibleCategories = filterCategories(categories, query, parent);
  return <div className="reserve-floating-action"><InventoryShell title="Categorías" description="Organiza tus productos con categorías y subcategorías." active="/inventory/categories" action={<div className="flex items-center gap-2"><ListFilters action="/inventory/categories" label="Buscar categoría" placeholder="Nombre de la categoría" query={query} activeFilters={Boolean(parent)} key={`${query}:${parent}`}>
      <div><label htmlFor="filter-parent" className="field-label">Ubicación</label><select id="filter-parent" name="parent" className="control" defaultValue={parent}>
        <option value="">Todas</option><option value="root">Solo categorías principales</option>
        {categoryLabels(categories).map((category) => <option key={category.id} value={category.id}>Dentro de {category.label}</option>)}
      </select></div>
    </ListFilters><CategoryDialog householdId={householdId} categories={categories} /></div>}>

    <CategoryManager householdId={householdId} categories={categories} visibleCategories={visibleCategories} />
  </InventoryShell></div>;
}
