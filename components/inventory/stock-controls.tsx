"use client";

import { createInventoryRequestId } from "@/lib/inventory/request-id";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { latestStock, type StockSnapshot } from "@/lib/inventory/stock-state";
import { inventoryAction } from "@/app/(account)/inventory/actions";

export function StockControls({ householdId, productId, name, quantity, revision, onStockChange, onAdjustingChange }: { householdId: string; productId: string; name: string; quantity: number; revision: number; onStockChange?: (stock: StockSnapshot) => void; onAdjustingChange?: (adjusting: boolean) => void }) {
  const router = useRouter();
  const [stock, setStock] = useState({ quantity, revision });
  if (revision > stock.revision) setStock({ quantity, revision });
  const displayQuantity = stock.quantity;
  const request = useRef<{ id: string; delta: number } | null>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  async function adjust(delta: number) {
    if (busy.current) return;
    if (request.current && request.current.delta !== delta) return;
    request.current ??= { id: createInventoryRequestId(), delta };
    const data = new FormData();
    for (const [key, value] of Object.entries({ kind: "adjust-stock", householdId, productId, requestId: request.current.id, delta: String(delta) })) data.set(key, value);
    busy.current = true;
    onAdjustingChange?.(true);
    setPending(true);
    setMessage("");
    setFailed(false);
    try {
      const result = await inventoryAction({ success: false, message: "" }, data);
      setFailed(!result.success);
      setMessage(result.success ? "Guardado" : result.message);
      if (result.success) {
        if (result.stock) {
          const confirmed = result.stock;
          setStock((current) => latestStock(current, confirmed));
          onStockChange?.(confirmed);
        }
        request.current = null;
        setUncertain(false);
        if (!onAdjustingChange) router.refresh();
      }
      else if (result.retryable) { setUncertain(true); }
      else { request.current = null; setUncertain(false); router.refresh(); }
    } catch {
      setFailed(true);
      setMessage("No pudimos confirmar el cambio. Reintenta la operación pendiente; no se aplicará dos veces.");
      setUncertain(true);
    } finally { busy.current = false; setPending(false); onAdjustingChange?.(false); }
  }
  return <div className="stack-tight" aria-busy={pending}>
    <div className="quantity-controls quantity-controls-compact" role="group" aria-label={`Existencias de ${name}`}>
      <button className="action-secondary text-xl" aria-label={`Restar una unidad de ${name}`} disabled={pending || uncertain || displayQuantity === 0} onClick={() => adjust(-1)}>−</button>
      <span className="quantity-value" aria-label={`${displayQuantity} en casa`}>{displayQuantity}</span>
      <button className="action-secondary text-xl" aria-label={`Sumar una unidad de ${name}`} disabled={pending || uncertain || displayQuantity === Number.MAX_SAFE_INTEGER} onClick={() => adjust(1)}>+</button>
    </div>
    <p role="status" className={failed ? "text-xs leading-5 text-warning" : "sr-only"}>{pending ? "Guardando…" : message}</p>
    {uncertain && <button className="action-secondary mt-2" disabled={pending} onClick={() => { if (request.current) adjust(request.current.delta); }}>Reintentar operación pendiente</button>}
  </div>;
}
