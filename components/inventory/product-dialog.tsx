"use client";

import { useState } from "react";
import { FormDialog } from "@/components/ui/form-dialog";
import { inventoryAction } from "@/app/(account)/inventory/actions";
import type { InventoryCategory } from "@/lib/inventory/categories";
import { ProductFields } from "./product-fields";
import { BulkProductFields } from "./bulk-product-fields";

export function ProductDialog({ householdId, categories }: { householdId: string; categories: InventoryCategory[] }) {
  const [multiple, setMultiple] = useState(false);
  return <FormDialog title="Agregar productos" triggerLabel="Agregar productos" floating submitLabel={multiple ? "Guardar productos" : "Guardar producto"} dialogClassName="modal-fluid" action={inventoryAction} hiddenFields={{ kind: multiple ? "create-products" : "create-product", householdId }} onOpen={() => setMultiple(false)}>
    <div role="group" aria-label="Forma de agregar productos" className="segmented-control self-start">
      <button type="button" className="section-link" aria-label="Un producto" aria-pressed={!multiple} onClick={() => setMultiple(false)}>Un producto</button>
      <button type="button" className="section-link" aria-label="Varios productos" aria-pressed={multiple} onClick={() => setMultiple(true)}>Varios productos</button>
    </div>
    <fieldset hidden={multiple} disabled={multiple}>
      <legend className="sr-only">Un producto</legend>
      <ProductFields categories={categories} />
    </fieldset>
    <fieldset hidden={!multiple} disabled={!multiple}>
      <legend className="sr-only">Varios productos</legend>
      <BulkProductFields categories={categories} />
    </fieldset>
  </FormDialog>;
}
