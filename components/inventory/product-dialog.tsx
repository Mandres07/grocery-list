import { FormDialog } from "@/components/ui/form-dialog";
import { inventoryAction } from "@/app/(account)/inventory/actions";
import type { InventoryCategory } from "@/lib/inventory/categories";
import { ProductFields } from "./product-fields";

export function ProductDialog({ householdId, categories }: { householdId: string; categories: InventoryCategory[] }) {
  return <FormDialog title="Agregar producto" triggerLabel="Agregar producto" floating submitLabel="Guardar producto" action={inventoryAction} hiddenFields={{ kind: "create-product", householdId }}>
    <ProductFields categories={categories} />
  </FormDialog>;
}
