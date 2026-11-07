import { MAX_CATEGORIES } from "@/lib/inventory/limits";
import { SelectControl } from "@/components/ui/select-control";
import { useId, type ChangeEventHandler } from "react";
import { categoryLabels, type InventoryCategory } from "@/lib/inventory/categories";

export function CategorySelect({ categories, name = "categoryId", label = "Categoría", defaultValue = "", excludeId, value, onChange, allowCreate = false, emptyLabel = "Sin categoría" }: {
  categories: InventoryCategory[]; name?: string; label?: string; defaultValue?: string; excludeId?: string;
  value?: string; onChange?: ChangeEventHandler<HTMLSelectElement>; allowCreate?: boolean; emptyLabel?: string;
}) {
  const id = useId();
  return <div><label htmlFor={id} className="field-label">{label}</label><SelectControl id={id} name={name} value={value} onChange={onChange} defaultValue={value === undefined ? defaultValue : undefined}>
    <option value="">{emptyLabel}</option>
    {categoryLabels(categories).filter((item) => item.id !== excludeId).map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
    {allowCreate && categories.length < MAX_CATEGORIES && <option value="__new__">+ Crear categoría…</option>}
  </SelectControl></div>;
}
