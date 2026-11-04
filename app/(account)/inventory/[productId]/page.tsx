import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { inventoryPageContext } from "@/lib/inventory/page-context";
import { getInventoryProduct, listInventoryCategories, listInventoryActivity } from "@/lib/inventory/queries";
import { ActionForm } from "@/components/ui/action-form";
import { FormField } from "@/components/ui/form-field";
import { ProductFields } from "@/components/inventory/product-fields";
import { ActivityList } from "@/components/inventory/activity-list";
import { RefreshInventory } from "@/components/inventory/refresh-inventory";
import { inventoryAction } from "../actions";

export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { user, householdId } = await inventoryPageContext();
  const { productId } = await params;
  if (!/^[a-f\d]{24}$/i.test(productId)) notFound();
  const [product, categories, movements] = await Promise.all([
    getInventoryProduct(user, householdId, productId), listInventoryCategories(user, householdId), listInventoryActivity(user, householdId, productId),
  ]);
  if (!product) notFound();
  const hiddenFields = { householdId, productId, revision: String(product.revision) };
  return <>
    <Link href="/inventory" className="button-secondary mb-6">Volver al inventario</Link>
    <h1 className="page-title break-words">{product.name}</h1>
    <p className="notice mt-5">{product.quantity} {product.unit} en casa{product.archived && " · Archivado"}</p>
    <RefreshInventory />
    {!product.archived && <div key={product.revision} className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="inventory-card"><h2 className="section-heading">Editar producto</h2><ActionForm action={inventoryAction} requestId={randomUUID()} submitLabel="Guardar producto" hiddenFields={{ ...hiddenFields, kind: "edit-product" }}><ProductFields categories={categories} product={product} /></ActionForm></section>
      <section className="inventory-card"><h2 className="section-heading">Corregir existencias</h2><p className="mt-2 text-sm leading-6 text-muted">Escribe el total que contaste en casa. Si alguien cambia las existencias mientras tanto, te pediremos actualizar antes de guardar.</p><ActionForm action={inventoryAction} requestId={randomUUID()} submitLabel="Guardar cantidad contada" hiddenFields={{ ...hiddenFields, kind: "correct-stock" }}><FormField label="Cantidad total en casa" name="quantity" type="number" min={0} step={1} max={Number.MAX_SAFE_INTEGER} required defaultValue={product.quantity} /></ActionForm></section>
    </div>}
    <section className="mt-8"><h2 className="section-heading">{product.archived ? "Restaurar producto" : "Archivar producto"}</h2><p className="mt-2 text-sm leading-6 text-muted">Archivar conserva las existencias y la actividad. Un producto archivado no permite ajustes hasta restaurarlo.</p><ActionForm action={inventoryAction} requestId={randomUUID()} submitLabel={product.archived ? "Restaurar producto" : "Archivar producto"} hiddenFields={{ ...hiddenFields, kind: product.archived ? "restore-product" : "archive-product" }} /></section>
    <ActivityList householdId={householdId} movements={movements} />
  </>;
}
