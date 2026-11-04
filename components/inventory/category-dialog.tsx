import { FormDialog } from "@/components/ui/form-dialog";
import { FormField } from "@/components/ui/form-field";
import { inventoryAction } from "@/app/(account)/inventory/actions";
import type { InventoryCategory } from "@/lib/inventory/categories";
import { CategorySelect } from "./category-select";

export function CategoryDialog({ householdId, categories, category, deleting = false }: {
  householdId: string; categories: InventoryCategory[]; category?: InventoryCategory; deleting?: boolean;
}) {
  const title = deleting ? "Eliminar categoría" : category ? "Editar categoría" : "Agregar categoría";
  const triggerLabel = deleting ? "Eliminar" : category ? "Editar" : title;
  const hiddenFields = { householdId, kind: deleting ? "delete-category" : "save-category", ...(category ? { categoryId: category.id } : {}) };
  return <FormDialog triggerIcon={category ? deleting ? "trash" : "edit" : undefined} floating={!category && !deleting} title={title} triggerLabel={triggerLabel} triggerAriaLabel={category ? `${triggerLabel} ${category.name}` : undefined} submitLabel={deleting ? "Eliminar categoría vacía" : "Guardar categoría"} action={inventoryAction} hiddenFields={hiddenFields} triggerClassName={category ? "action-quiet action-icon" : "action-primary"}>
    {deleting ? <p className="text-sm leading-6">Se eliminará <strong>{category?.name}</strong>. Primero debes mover sus productos y subcategorías, incluidos los productos archivados.</p> : <>
      <FormField label="Nombre de la categoría" name="name" required maxLength={100} defaultValue={category?.name ?? ""} />
      <CategorySelect name="parentId" emptyLabel="Categoría principal" label="Dentro de otra categoría (opcional)" categories={categories} defaultValue={category?.parentId ?? ""} excludeId={category?.id} />
    </>}
  </FormDialog>;
}
