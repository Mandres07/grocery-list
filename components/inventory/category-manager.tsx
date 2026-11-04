import { randomUUID } from "node:crypto";
import { ActionForm } from "@/components/ui/action-form";
import { FormField } from "@/components/ui/form-field";
import { CategorySelect } from "./product-fields";
import { categoryLabels, type InventoryCategory } from "@/lib/inventory/categories";
import { inventoryAction } from "@/app/(account)/inventory/actions";

export function CategoryManager({ householdId, categories }: { householdId: string; categories: InventoryCategory[] }) {
  return <details className="disclosure section-separated">
    <summary className="disclosure-trigger">Gestionar categorías</summary>
    <h2 className="heading-section mt-4">Nueva categoría</h2>
    <ActionForm action={inventoryAction} requestId={randomUUID()} submitLabel="Crear categoría" hiddenFields={{ householdId, kind: "save-category" }} resetOnSuccess>
      <FormField label="Nombre de la categoría" name="name" required maxLength={100} />
      <CategorySelect name="parentId" label="Dentro de otra categoría (opcional)" categories={categories} />
    </ActionForm>
    {categories.length === 0 ? <p className="mt-4 text-sm text-muted">Puedes organizar los productos sin categorías o crear la primera aquí.</p> : <ul className="mt-4">{categoryLabels(categories).map((category) => <li key={category.id}>
      <details className="disclosure"><summary className="disclosure-trigger">{category.label}</summary>
        <ActionForm action={inventoryAction} requestId={randomUUID()} submitLabel="Guardar categoría" hiddenFields={{ householdId, kind: "save-category", categoryId: category.id }}>
          <FormField label="Nombre" name="name" defaultValue={category.name} required maxLength={100} />
          <CategorySelect name="parentId" label="Categoría superior" categories={categories} defaultValue={category.parentId ?? ""} excludeId={category.id} />
        </ActionForm>
        <ActionForm action={inventoryAction} requestId={randomUUID()} submitLabel="Eliminar categoría vacía" hiddenFields={{ householdId, kind: "delete-category", categoryId: category.id }} />
      </details>
    </li>)}</ul>}
  </details>;
}
