"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { latestStock } from "@/lib/inventory/stock-state";
import { inventoryAction } from "@/app/(account)/inventory/actions";

export function StockControls({ householdId, productId, name, quantity, revision }: { householdId: string; productId: string; name: string; quantity: number; revision: number }) {
  const router = useRouter();
  const [stock, setStock] = useState({ quantity, revision });
  if (revision > stock.revision) setStock({ quantity, revision });
  const displayQuantity = stock.quantity;
  const request = useRef<{ id: string; delta: number } | null>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false);
  async function adjust(delta: number) {
    if (busy.current) return;
    if (request.current && request.current.delta !== delta) return;
    request.current ??= { id: crypto.randomUUID(), delta };
    const data = new FormData();
    for (const [key, value] of Object.entries({ kind: "adjust-stock", householdId, productId, requestId: request.current.id, delta: String(delta) })) data.set(key, value);
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const result = await inventoryAction({ success: false, message: "" }, data);
      setMessage(result.message);
      if (result.success) {
        if (result.stock) {
          const confirmed = result.stock;
          setStock((current) => latestStock(current, confirmed));
        }
        request.current = null;
        setUncertain(false);
        router.refresh();
      }
      else if (result.retryable) { setUncertain(true); }
      else { request.current = null; setUncertain(false); router.refresh(); }
    } catch {
      setMessage("No pudimos confirmar el cambio. Reintenta la operación pendiente; no se aplicará dos veces.");
      setUncertain(true);
    } finally { busy.current = false; setPending(false); }
  }
  return <div className="stack-tight">
    <div className="quantity-controls">
      <button className="action-secondary text-xl" aria-label={`Restar una unidad de ${name}`} disabled={pending || uncertain || displayQuantity === 0} onClick={() => adjust(-1)}>−</button>
      <span className="min-w-8 text-center text-lg font-semibold tabular-nums" aria-label={`${displayQuantity} en casa`}>{displayQuantity}</span>
      <button className="action-secondary text-xl" aria-label={`Sumar una unidad de ${name}`} disabled={pending || uncertain || displayQuantity === Number.MAX_SAFE_INTEGER} onClick={() => adjust(1)}>+</button>
      {pending && <span className="text-xs text-muted">Guardando…</span>}
    </div>
    <p role="status" className="feedback text-xs text-muted">{message}</p>
    {uncertain && <button className="action-secondary mt-2" disabled={pending} onClick={() => { if (request.current) adjust(request.current.delta); }}>Reintentar operación pendiente</button>}
  </div>;
}
