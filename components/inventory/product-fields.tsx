import { FormField } from "@/components/ui/form-field";
import type { InventoryCategory } from "@/lib/inventory/categories";
import { ProductCategoryField } from "./product-category-field";

export function ProductFields({ categories, product }: { categories: InventoryCategory[]; product?: { name: string; unit: string; categoryId: string | null; lowStockThreshold: number | null } }) {
  return <div className="form-grid">
    <div className="span-full"><FormField label="Nombre del producto" name="name" defaultValue={product?.name ?? ""} required maxLength={160} /></div>
    <FormField label="Unidad" name="unit" defaultValue={product?.unit ?? "unidades"} required maxLength={60} hint="Ej.: bolsas, botellas o unidades." />
    {!product && <FormField label="Cantidad inicial" name="quantity" type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1} defaultValue={0} required />}
    <div className="span-full"><ProductCategoryField categories={categories} defaultValue={product?.categoryId ?? ""} /></div>
    <div className="span-full"><FormField label="Avisar cuando queden" name="lowStockThreshold" type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1} defaultValue={product?.lowStockThreshold ?? ""} hint="Opcional. Con 2, avisaremos cuando queden 2 unidades o menos." /></div>
  </div>;
}
