import { createInventoryRequestId } from "@/lib/inventory/request-id";
import Link from "next/link";
import { notFound } from "next/navigation";
import { inventoryPageContext } from "@/lib/inventory/page-context";
import { getInventoryProduct, listInventoryCategories, listInventoryActivity } from "@/lib/inventory/queries";
import { categoryLabels } from "@/lib/inventory/categories";
import { ActionForm } from "@/components/ui/action-form";
import { FormField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { SectionPanel } from "@/components/ui/section-panel";
import { SectionNavigation } from "@/components/ui/section-navigation";
import { ProductFields } from "@/components/inventory/product-fields";
import { ActivityList } from "@/components/inventory/activity-list";
import { StockBadge } from "@/components/inventory/stock-badge";
import { stockStatus } from "@/lib/inventory/stock-status";
import { RefreshInventory } from "@/components/inventory/refresh-inventory";
import { inventoryAction } from "../actions";

export default async function ProductPage({ params, searchParams }: {
  params: Promise<{ productId: string }>; searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { user, householdId } = await inventoryPageContext();
  const { productId } = await params;
  if (!/^[a-f\d]{24}$/i.test(productId)) notFound();
  const product = await getInventoryProduct(user, householdId, productId);
  if (!product) notFound();
  const { tab } = await searchParams;
  const active = tab === "stock" || tab === "activity" || tab === "manage" ? tab : "details";
  const href = `/inventory/${productId}`;
  const sections = [
    { href, label: "Detalles" },
    { href: `${href}?tab=stock`, label: "Existencias" },
    { href: `${href}?tab=activity`, label: "Actividad" },
    { href: `${href}?tab=manage`, label: "Opciones" },
  ];
  const categories = active === "details" ? await listInventoryCategories(user, householdId) : [];
  const movements = active === "activity" ? await listInventoryActivity(user, householdId, productId) : [];
  const hiddenFields = { householdId, productId, revision: String(product.revision) };
  const manageHref = `${href}?tab=manage`;
  return <>
    <header className="flex items-start gap-3 border-b border-line pb-3 md:items-center">
      <Link href="/inventory" className="action-secondary action-icon shrink-0" aria-label="Volver al inventario" title="Volver al inventario"><Icon name="arrow" className="glyph-icon rotate-180" /></Link>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3">
        <h1 className="heading-title min-w-0 break-words">{product.name}</h1>
        <div className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 md:ml-auto md:justify-end md:text-right">
          <p className="text-sm text-muted"><span className="font-semibold tabular-nums text-foreground">{product.quantity}</span> {product.unit} en casa</p>
          <StockBadge status={stockStatus(product.quantity, product.lowStockThreshold, product.archived)} />
        </div>
      </div>
    </header>
    <SectionNavigation label="Secciones del producto" items={sections} active={active === "details" ? href : `${href}?tab=${active}`} />
    <div key={`${active}:${product.revision}`} className="mt-3">
      {active === "details" && <div className="measure-form"><SectionPanel title="Detalles del producto" icon="edit">
        {product.archived ? <>
          <dl><div className="data-pair"><dt>Unidad</dt><dd>{product.unit}</dd></div><div className="data-pair"><dt>Categoría</dt><dd>{categoryLabels(categories).find((category) => category.id === product.categoryId)?.label ?? "Sin categoría"}</dd></div><div className="data-pair"><dt>Aviso de existencias</dt><dd>{product.lowStockThreshold ?? "Sin aviso"}</dd></div></dl>
          <p className="mt-3 text-sm text-muted">Restaura el producto para editarlo.</p><Link href={manageHref} className="action-secondary mt-3">Restaurar producto</Link>
        </> : <ActionForm action={inventoryAction} requestId={createInventoryRequestId()} embedded submitLabel="Guardar producto" hiddenFields={{ ...hiddenFields, kind: "edit-product" }}><ProductFields categories={categories} product={product} /></ActionForm>}
      </SectionPanel></div>}
      {active === "stock" && <div className="measure-form"><SectionPanel title="Corregir existencias" description="Escribe el total que contaste en casa. Si alguien cambia las existencias mientras tanto, te pediremos actualizar antes de guardar." icon="basket">
        {product.archived ? <><p className="notice">Restaura el producto antes de cambiar las existencias.</p><Link href={manageHref} className="action-secondary mt-3">Restaurar producto</Link></> : <ActionForm action={inventoryAction} requestId={createInventoryRequestId()} embedded submitLabel="Guardar cantidad contada" hiddenFields={{ ...hiddenFields, kind: "correct-stock" }}><FormField label="Cantidad total en casa" name="quantity" type="number" min={0} step={1} max={Number.MAX_SAFE_INTEGER} required defaultValue={product.quantity} /></ActionForm>}
      </SectionPanel></div>}
      {active === "activity" && <ActivityList householdId={householdId} movements={movements} expanded />}
      {active === "manage" && <div className="measure-form"><SectionPanel title={product.archived ? "Restaurar producto" : "Archivar producto"} description="Archivar conserva las existencias y la actividad. Un producto archivado no permite ajustes hasta restaurarlo." icon="folder">
        <ActionForm action={inventoryAction} requestId={createInventoryRequestId()} submitLabel={product.archived ? "Restaurar producto" : "Archivar producto"} hiddenFields={{ ...hiddenFields, kind: product.archived ? "restore-product" : "archive-product" }} />
      </SectionPanel></div>}
    </div>
    <RefreshInventory />
  </>;
}
