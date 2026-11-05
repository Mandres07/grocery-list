import { randomUUID } from "node:crypto";
import { inventoryPageContext } from "@/lib/inventory/page-context";
import { listShoppingItems, shoppingProductOptions } from "@/lib/shopping/queries";
import { SHOPPING_LABELS, type ShoppingStatus } from "@/lib/shopping/state";
import { SectionNavigation } from "@/components/ui/section-navigation";
import { FormDialog } from "@/components/ui/form-dialog";
import { ListFilters } from "@/components/ui/list-filters";
import { RefreshInventory } from "@/components/inventory/refresh-inventory";
import { ShoppingItemFields } from "@/components/shopping/item-fields";
import { ShoppingItems } from "@/components/shopping/shopping-items";
import { shoppingAction } from "./actions";

export default async function ShoppingPage({ searchParams }: { searchParams: Promise<{ status?: string | string[]; q?: string | string[] }> }) {
  const { user, householdId } = await inventoryPageContext();
  const params = await searchParams;
  const status: ShoppingStatus = params.status === "purchased" || params.status === "received" ? params.status : "pending";
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 160) : "";
  const [{ items, total, receiptItems }, products] = await Promise.all([listShoppingItems(user, householdId, status, query), status === "pending" ? shoppingProductOptions(user, householdId) : Promise.resolve([])]);
  const href = (value: ShoppingStatus) => value === "pending" ? "/shopping" : `/shopping?status=${value}`;
  return <div className={status === "pending" ? "reserve-floating-action" : ""}>
    <header className="section-header">
      <div><h1 className="heading-title">Lista de compras</h1><p className="sr-only">Lo que falta en casa, compartido con tu hogar.</p></div>
      <div className="flex items-center gap-2">
        <ListFilters action="/shopping" clearHref={href(status)} label="Buscar artículo" placeholder="Nombre del artículo" query={query} activeFilters={false} key={`${status}:${query}`}><input type="hidden" name="status" value={status} /></ListFilters>
        {status === "pending" && <FormDialog title="Agregar a la lista" triggerLabel="Agregar artículo" submitLabel="Agregar a la lista" action={shoppingAction} floating hiddenFields={{ kind: "add", householdId }}><ShoppingItemFields householdId={householdId} products={products} /></FormDialog>}
      </div>
    </header>
    <SectionNavigation label="Estado de las compras" items={(Object.keys(SHOPPING_LABELS) as ShoppingStatus[]).map((value) => ({ href: href(value), label: SHOPPING_LABELS[value] }))} active={href(status)} />
    {status === "pending" ? <div className="mt-3"><FormDialog title="Agregar productos por reponer" triggerLabel="Agregar faltantes" triggerClassName="action-secondary" submitLabel="Agregar faltantes" action={shoppingAction} hiddenFields={{ kind: "low-stock", householdId }}><p className="text-sm leading-6">Agregaremos los productos sin existencias y los que llegaron al aviso de reposición, con cantidad 1. Puedes escribir la cantidad en la lista y pulsar el check para marcarlo como comprado. Los que ya estén pendientes o comprados conservarán su cantidad.</p></FormDialog></div> : status === "purchased" ? <p className="mt-3 text-xs text-muted">Revisa las cantidades y confirma toda la compra cuando llegue a casa.</p> : <p className="mt-3 text-xs text-muted">Las recepciones quedan guardadas. No se vuelven a sumar al inventario.</p>}
    <ShoppingItems key={`${status}:${query}`} receiptItems={receiptItems} receiptRequestId={randomUUID()} householdId={householdId} items={items} total={total} status={status} filtered={Boolean(query)} />
    <RefreshInventory />
  </div>;
}
