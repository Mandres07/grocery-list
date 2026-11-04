"use client";

import { useState } from "react";
import { FormField } from "@/components/ui/form-field";
import type { InventoryCategory } from "@/lib/inventory/categories";
import { CategorySelect } from "./category-select";

export function ProductCategoryField({ categories, defaultValue = "" }: { categories: InventoryCategory[]; defaultValue?: string }) {
  const [choice, setChoice] = useState(defaultValue);
  const creating = choice === "__new__";
  return <div className="stack-tight">
    <CategorySelect categories={categories} name="categoryChoice" value={choice} onChange={(event) => setChoice(event.target.value)} allowCreate />
    <input type="hidden" name="categoryId" value={creating ? "" : choice} />
    {creating && <div className="surface-outlined stack-tight">
      <FormField label="Nombre de la nueva categoría" name="newCategoryName" required maxLength={100} />
      <CategorySelect categories={categories} name="newCategoryParentId" emptyLabel="Categoría principal" label="Dentro de otra categoría (opcional)" />
      <p className="field-hint">Se guardará junto con el producto.</p>
    </div>}
  </div>;
}
