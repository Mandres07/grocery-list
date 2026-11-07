"use client";

import Link from "next/link";
import { useState } from "react";
import type { listShoppingItems } from "@/lib/shopping/queries";
import { latestShopping, SHOPPING_LABELS, type ReceiptItem, type ShoppingSnapshot, type ShoppingStatus } from "@/lib/shopping/state";
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
  const [confirmation, setConfirmation] = useState<{ name: string; status: ShoppingStatus } | null>(null);
  const records = items.map((item) => confirmed[item.id] ? { ...item, ...latestShopping(item, confirmed[item.id]) } : item);
  const visible = records.filter((item) => item.status === status);
  const count = Math.max(0, total - (records.length - visible.length));
  const selected = receiptItems.flatMap((item) => {
    const current = latestShopping({ ...item, status: "purchased" }, confirmed[item.id] ?? { ...item, status: "purchased" });
    return current.status === "purchased" ? [{ id: item.id, revision: current.revision, quantity: current.quantity }] : [];
  });
  const selection = JSON.stringify(selected);
  function confirm(item: ShoppingSnapshot, name: string) {
    setConfirmed((current) => ({ ...current, [item.id]: current[item.id] ? latestShopping(current[item.id], item) : item }));
    setConfirmation({ name, status: item.status });
  }
  function reportStatus(id: string, status: FormStatus) { setRowStatus((current) => ({ ...current, [id]: status })); }
  return <>
    <div role="status" className={confirmation ? "notice mt-3" : "sr-only"}>{confirmation && <>
      <p>{confirmation.status === "purchased" ? `${confirmation.name} se guardó en Comprados. El inventario aún no cambia.` : confirmation.status === "received" ? `${confirmation.name} ya está en Recibidos.` : `${confirmation.name} volvió a Pendientes con su cantidad guardada.`}</p>
      <Link href={confirmation.status === "pending" ? "/shopping" : `/shopping?status=${confirmation.status}`} className="action-link">Ver {SHOPPING_LABELS[confirmation.status].toLowerCase()}</Link>
    </>}</div>
    {status === "purchased" && !filtered && selected.length > 0 && <div className="mt-3">
      <ActionForm key={selection} successHref="/shopping?status=received" action={shoppingAction} requestId={receiptRequestId} submitLabel={`Confirmar recepción (${selected.length})`} disabled={Object.values(rowStatus).some((value) => value !== "idle")} onStatusChange={setBatchStatus} hiddenFields={{ householdId, kind: "receive-batch", items: selection }} />
      <p className="field-hint">Se sumarán estas cantidades al inventario en una sola confirmación. Los artículos personalizados quedarán recibidos sin cambiar existencias.</p>
    </div>}
    {status === "purchased" && filtered && <Link href="/shopping?status=purchased" className="action-link mt-3">Ver toda la compra para confirmar la recepción</Link>}
    <p className="mt-4 text-xs text-muted">{count} {count === 1 ? "artículo" : "artículos"}</p>
    {!visible.length ? <p className="notice mt-2">{filtered ? "No hay artículos que coincidan con esta búsqueda." : status === "pending" ? "Tu lista está al día. Agrega un artículo o incluye los productos por reponer." : status === "purchased" ? "Marca los artículos como comprados para confirmar toda la compra aquí." : "La última compra recibida aparecerá aquí."}</p> : <ul className="record-list collection-surface mt-2">{visible.map((item) => <ShoppingItemRow key={item.id} householdId={householdId} item={item} disabled={batchStatus !== "idle"} onChange={(snapshot) => confirm(snapshot, item.name)} onStatusChange={reportStatus} />)}</ul>}
  </>;
}
