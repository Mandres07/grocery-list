"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { shoppingAction } from "@/app/(account)/shopping/actions";
import type { listShoppingItems } from "@/lib/shopping/queries";
import type { ShoppingSnapshot } from "@/lib/shopping/state";
import type { FormStatus } from "@/components/ui/action-form";
import { FormDialog } from "@/components/ui/form-dialog";
import { QuantityInput } from "@/components/ui/quantity-input";
import { Icon } from "@/components/ui/icon";

type Item = Awaited<ReturnType<typeof listShoppingItems>>["items"][number];

export function ShoppingItemRow({ householdId, item, disabled, onChange, onStatusChange }: {
  householdId: string; item: Item; disabled: boolean; onChange: (item: ShoppingSnapshot) => void; onStatusChange: (id: string, status: FormStatus) => void;
}) {
  const id = useId();
  const router = useRouter();
  const request = useRef<FormData | null>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");
  const [entry, setEntry] = useState({ revision: item.revision, quantity: item.quantity, draft: String(item.quantity) });
  // Refresh clean fields, but retain the revision of an unsaved quantity for conflict detection.
  if (item.revision > entry.revision && entry.draft === String(entry.quantity) && !pending && !uncertain) setEntry({ revision: item.revision, quantity: item.quantity, draft: String(item.quantity) });
  const purchased = item.status === "purchased";
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || disabled) return;
    if (!request.current) {
      const data = new FormData(event.currentTarget);
      for (const [key, value] of Object.entries({ householdId, itemId: item.id, revision: String(entry.revision), kind: "purchase", purchased: purchased ? "no" : "yes", requestId: crypto.randomUUID() })) data.set(key, value);
      request.current = data;
    }
    busy.current = true;
    setPending(true);
    setMessage("");
    onStatusChange(item.id, "pending");
    try {
      const result = await shoppingAction({ success: false, message: "" }, request.current);
      if (result.success) {
        request.current = null;
        setUncertain(false);
        onStatusChange(item.id, "idle");
        if (result.item) onChange(result.item);
        router.refresh();
      } else {
        setMessage(result.message);
        setUncertain(Boolean(result.retryable));
        onStatusChange(item.id, result.retryable ? "uncertain" : "idle");
        if (!result.retryable) { request.current = null; router.refresh(); }
      }
    } catch {
      setUncertain(true);
      onStatusChange(item.id, "uncertain");
      setMessage("No pudimos confirmar el cambio. Reintenta; conservamos la misma cantidad y solicitud.");
    } finally { busy.current = false; setPending(false); }
  }
  return <li className={`event-row ${item.status === "pending" ? "record-adjustable" : ""}`}>
    {item.status !== "received" && <form id={id} method="post" onSubmit={save} className="stack-tight" aria-busy={pending} data-dirty={entry.draft !== String(entry.quantity)} data-uncertain={uncertain}>
      <button type="submit" className={`action-secondary action-icon action-compact ${purchased ? "text-brand bg-sage" : "text-muted"}`} aria-pressed={purchased} aria-label={`${purchased ? "Volver a pendientes:" : "Marcar como comprado:"} ${item.name}`} disabled={pending || uncertain || disabled}><Icon name="check" className={`glyph-icon ${purchased ? "" : "opacity-30"}`} /></button>
    </form>}
    <div className="min-w-0 flex-1">
      <p className="record-title break-words line-clamp-2" title={item.name}>{item.productId ? <Link href={`/inventory/${item.productId}`} className="hover:text-brand">{item.name}</Link> : item.name}</p>
      <p className="text-xs text-muted break-words">{item.unit}{!item.productId && " · Personalizado"}</p>
      {item.status === "received" && <p className="text-xs leading-5 text-muted">{item.productId ? "Añadido al inventario" : "Recibido sin modificar inventario"}{item.receivedAt && <> · <time dateTime={item.receivedAt}>{new Date(item.receivedAt).toLocaleString("es", { dateStyle: "short", timeStyle: "short", timeZone: "America/Panama" })}</time></>}</p>}
    </div>
    {item.status !== "pending" && <span className="quantity-value text-brand" aria-label={`Cantidad: ${item.status === "received" ? item.receivedQuantity ?? item.quantity : item.quantity}`}>{item.status === "received" ? item.receivedQuantity ?? item.quantity : item.quantity}</span>}
    {item.status === "pending" && <div className="record-adjustment"><QuantityInput compact form={id} label={item.name} value={entry.draft} disabled={pending || uncertain || disabled} onChange={(draft) => setEntry({ ...entry, draft })} /></div>}
    {item.status !== "received" && <FormDialog title="Quitar de la lista" triggerLabel="Quitar" triggerAriaLabel={`Quitar ${item.name} de la lista`} triggerIcon="trash" triggerClassName="action-quiet action-icon action-compact" disabled={pending || uncertain || disabled} submitLabel="Quitar artículo" action={shoppingAction} hiddenFields={{ householdId, itemId: item.id, revision: String(item.revision), kind: "delete" }}><p className="text-sm">Se quitará <strong>{item.name}</strong> de la lista. El inventario no cambiará.</p></FormDialog>}
    <p role="status" className={message ? "field-hint text-warning span-full" : "sr-only"}>{pending ? "Guardando…" : message}</p>
    {uncertain && <button type="submit" form={id} className="action-secondary span-full" disabled={pending || disabled}>Reintentar operación pendiente</button>}
  </li>;
}
