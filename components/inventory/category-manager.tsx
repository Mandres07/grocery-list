import { Icon } from "@/components/ui/icon";
import { RecordRow } from "@/components/ui/record-row";
import { categoryLabels, type InventoryCategory } from "@/lib/inventory/categories";
import { CategoryDialog } from "./category-dialog";

export function CategoryManager({ householdId, categories, visibleCategories = categoryLabels(categories) }: {
  householdId: string; categories: InventoryCategory[]; visibleCategories?: ReturnType<typeof categoryLabels>;
}) {
  const labels = new Map(categoryLabels(categories).map((category) => [category.id, category.label]));
  return <>
    <p className="mt-4 text-xs text-muted">{visibleCategories.length} {visibleCategories.length === 1 ? "categoría encontrada" : "categorías encontradas"}</p>
    {visibleCategories.length === 0 ? <p className="notice mt-4">No hay categorías en esta vista. Agrega una o cambia los filtros.</p> : <ul className="record-list collection-surface mt-2">{visibleCategories.map((category) => <li key={category.id}>
      <RecordRow leading={<span className="symbol-muted"><Icon name="folder" className="glyph-icon" /></span>} title={category.name} description={category.parentId ? `Dentro de ${labels.get(category.parentId) ?? "otra categoría"}` : "Principal"}>
        <div className="flex flex-wrap gap-2">
          <CategoryDialog householdId={householdId} categories={categories} category={category} />
          <CategoryDialog householdId={householdId} categories={categories} category={category} deleting />
        </div>
      </RecordRow>
    </li>)}</ul>}
  </>;
}
