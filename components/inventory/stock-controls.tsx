"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { inventoryAction } from "@/app/(account)/inventory/actions";

export function StockControls({ householdId, productId, name, quantity }: { householdId: string; productId: string; name: string; quantity: number }) {
  const router = useRouter();
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
      if (result.success) { request.current = null; setUncertain(false); router.refresh(); }
      else if (result.retryable) { setUncertain(true); }
      else { request.current = null; setUncertain(false); router.refresh(); }
    } catch {
      setMessage("No pudimos confirmar el cambio. Reintenta la operación pendiente; no se aplicará dos veces.");
      setUncertain(true);
    } finally { busy.current = false; setPending(false); }
  }
  return <div>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button className="button-secondary text-xl" aria-label={`Restar una unidad de ${name}`} disabled={pending || uncertain || quantity === 0} onClick={() => adjust(-1)}>−</button>
      <span className="min-w-8 text-center text-lg font-semibold tabular-nums" aria-label={`${quantity} en casa`}>{quantity}</span>
      <button className="button-secondary text-xl" aria-label={`Sumar una unidad de ${name}`} disabled={pending || uncertain || quantity === Number.MAX_SAFE_INTEGER} onClick={() => adjust(1)}>+</button>
      {pending && <span className="text-xs text-muted">Guardando…</span>}
    </div>
    <p role="status" className="mt-2 text-xs leading-5 text-muted">{message}</p>
    {uncertain && <button className="button-secondary mt-2" disabled={pending} onClick={() => { if (request.current) adjust(request.current.delta); }}>Reintentar operación pendiente</button>}
  </div>;
}
