import { useId, type ChangeEventHandler } from "react";
import { categoryLabels, type InventoryCategory } from "@/lib/inventory/categories";

export function CategorySelect({ categories, name = "categoryId", label = "Categoría", defaultValue = "", excludeId, value, onChange, allowCreate = false, emptyLabel = "Sin categoría" }: {
  categories: InventoryCategory[]; name?: string; label?: string; defaultValue?: string; excludeId?: string;
  value?: string; onChange?: ChangeEventHandler<HTMLSelectElement>; allowCreate?: boolean; emptyLabel?: string;
}) {
  const id = useId();
  return <div><label htmlFor={id} className="field-label">{label}</label><select id={id} name={name} value={value} onChange={onChange} defaultValue={value === undefined ? defaultValue : undefined} className="control">
    <option value="">{emptyLabel}</option>
    {categoryLabels(categories).filter((item) => item.id !== excludeId).map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
    {allowCreate && <option value="__new__">+ Crear categoría…</option>}
  </select></div>;
}
