"use client";

import Link from "next/link";
import { useState } from "react";
import type { listShoppingItems } from "@/lib/shopping/queries";
import { latestShopping, type ReceiptItem, type ShoppingSnapshot, type ShoppingStatus } from "@/lib/shopping/state";
import { ActionForm, type FormStatus } from "@/components/ui/action-form";
import { shoppingAction } from "@/app/(account)/shopping/actions";
import { ShoppingItemRow } from "./shopping-item-row";

type Item = Awaited<ReturnType<typeof listShoppingItems>>["items"][number];

export function ShoppingItems({ householdId, items, total, status, filtered = false, receiptItems = [], receiptRequestId }: {
  householdId: string; items: Item[]; total: number; status: ShoppingStatus; filtered?: boolean; receiptItems?: ReceiptItem[]; receiptRequestId: string;
}) {
  const [confirmed, setConfirmed] = useState<Record<string, ShoppingSnapshot>>({});
  const [batchStatus, setBatchStatus] = useState<FormStatus>("idle");
  const [rowStatus, setRowStatus] = useState<Record<string, FormStatus>>({});
  const records = items.map((item) => confirmed[item.id] ? { ...item, ...latestShopping(item, confirmed[item.id]) } : item);
  const visible = records.filter((item) => item.status === status);
  const count = Math.max(0, total - (records.length - visible.length));
  const selected = receiptItems.flatMap((item) => {
    const current = latestShopping({ ...item, status: "purchased" }, confirmed[item.id] ?? { ...item, status: "purchased" });
    return current.status === "purchased" ? [{ id: item.id, revision: current.revision, quantity: current.quantity }] : [];
  });
  const selection = JSON.stringify(selected);
  function confirm(item: ShoppingSnapshot) { setConfirmed((current) => ({ ...current, [item.id]: current[item.id] ? latestShopping(current[item.id], item) : item })); }
  function reportStatus(id: string, status: FormStatus) { setRowStatus((current) => ({ ...current, [id]: status })); }
  return <>
    {status === "purchased" && !filtered && selected.length > 0 && <div className="mt-3">
      <ActionForm key={selection} successHref="/shopping?status=received" action={shoppingAction} requestId={receiptRequestId} submitLabel={`Confirmar recepción (${selected.length})`} disabled={Object.values(rowStatus).some((value) => value !== "idle")} onStatusChange={setBatchStatus} hiddenFields={{ householdId, kind: "receive-batch", items: selection }} />
      <p className="field-hint">Se sumarán estas cantidades al inventario en una sola confirmación. Los artículos personalizados quedarán recibidos sin cambiar existencias.</p>
    </div>}
    {status === "purchased" && filtered && <Link href="/shopping?status=purchased" className="action-link mt-3">Ver toda la compra para confirmar la recepción</Link>}
    <p className="mt-4 text-xs text-muted">{count} {count === 1 ? "artículo" : "artículos"}{count > 100 && " · Se muestran los primeros 100; busca por nombre para encontrar el resto."}</p>
    {!visible.length ? <p className="notice mt-2">{filtered ? "No hay artículos que coincidan con esta búsqueda." : status === "pending" ? "Tu lista está al día. Agrega un artículo o incluye los productos por reponer." : status === "purchased" ? "Marca los artículos como comprados para confirmar toda la compra aquí." : "Las recepciones confirmadas aparecerán aquí."}</p> : <ul className="record-list collection-surface mt-2">{visible.map((item) => <ShoppingItemRow key={item.id} householdId={householdId} item={item} disabled={batchStatus !== "idle"} onChange={confirm} onStatusChange={reportStatus} />)}</ul>}
  </>;
}
