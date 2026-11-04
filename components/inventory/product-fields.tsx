import { FormField } from "@/components/ui/form-field";
import { categoryLabels, type InventoryCategory } from "@/lib/inventory/categories";
import { useId } from "react";

export function CategorySelect({ categories, name = "categoryId", label = "Categoría", defaultValue = "", excludeId }: {
  categories: InventoryCategory[]; name?: string; label?: string; defaultValue?: string; excludeId?: string;
}) {
  const id = useId();
  return <div><label htmlFor={id} className="field-label">{label}</label><select id={id} name={name} defaultValue={defaultValue} className="control">
    <option value="">Sin categoría</option>
    {categoryLabels(categories).filter((item) => item.id !== excludeId).map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
  </select></div>;
}

export function ProductFields({ categories, product }: { categories: InventoryCategory[]; product?: { name: string; unit: string; categoryId: string | null; lowStockThreshold: number | null } }) {
  return <>
    <FormField label="Nombre del producto" name="name" defaultValue={product?.name ?? ""} required maxLength={160} />
    <FormField label="Unidad" name="unit" defaultValue={product?.unit ?? "unidades"} required maxLength={60} hint="Por ejemplo: bolsas, botellas o unidades. Las cantidades son enteras." />
    <CategorySelect categories={categories} defaultValue={product?.categoryId ?? ""} />
    {!product && <FormField label="Cantidad inicial" name="quantity" type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1} defaultValue={0} required />}
    <FormField label="Avisar cuando queden" name="lowStockThreshold" type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1} defaultValue={product?.lowStockThreshold ?? ""} hint="Opcional. Con 2, el producto aparecerá por reponer cuando queden 2 o menos." />
  </>;
}
