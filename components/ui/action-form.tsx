"use client";

import { Icon, type IconName } from "./icon";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import type { AccountFormAction, AccountFormState } from "@/lib/auth/form-state";

export type FormStatus = "idle" | "pending" | "uncertain";

export function ActionForm({ action, requestId: initialRequestId, hiddenFields = {}, submitLabel, children, resetOnSuccess = false, onSuccess, onStatusChange, embedded = false, submitClassName = "action-primary", submitAriaLabel, submitIcon }: {
  submitClassName?: string; submitAriaLabel?: string; submitIcon?: IconName; action: AccountFormAction; requestId: string; hiddenFields?: Record<string, string>; submitLabel: string; children?: ReactNode; resetOnSuccess?: boolean; embedded?: boolean; onSuccess?: () => void; onStatusChange?: (status: FormStatus) => void;
}) {
  const requestId = useRef(initialRequestId);
  const busy = useRef(false);
  const pendingData = useRef<FormData | null>(null);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [state, setState] = useState<AccountFormState>({ success: false, message: "" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const data = pendingData.current ?? new FormData(form);
    data.set("requestId", requestId.current);
    pendingData.current = data;
    busy.current = true;
    setPending(true);
    onStatusChange?.("pending");
    setState({ success: false, message: "" });
    try {
      const result = await action({ success: false, message: "" }, data);
      setState(result);
      if (result.success) {
        pendingData.current = null;
        setUncertain(false);
        requestId.current = crypto.randomUUID();
        form.dataset.dirty = "false";
        if (resetOnSuccess) form.reset();
        onStatusChange?.("idle");
        onSuccess?.();
        // Reopen the canonical server view after a confirmed write, preserving its URL and filters.
        window.location.reload();
      } else if (result.retryable) { setUncertain(true); onStatusChange?.("uncertain"); }
      else { pendingData.current = null; setUncertain(false); requestId.current = crypto.randomUUID(); onStatusChange?.("idle"); }
    } catch {
      setUncertain(true);
      onStatusChange?.("uncertain");
      setState({ success: false, message: "No pudimos confirmar el resultado. Reintenta la operación pendiente; conservamos los mismos datos para evitar aplicarla dos veces." });
    } finally { busy.current = false; setPending(false); }
  }
  return <form method="post" onSubmit={submit} onChange={(event) => { event.currentTarget.dataset.dirty = "true"; }} className={`stack form-flow ${children && !embedded ? "surface-raised" : ""}`} aria-busy={pending}>
    {Object.entries(hiddenFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <fieldset disabled={pending || uncertain} className="stack">{children}</fieldset>
    <p role="status" className={`feedback ${state.success ? "text-brand" : "text-warning"}`}>{state.message}</p>
    <button className={submitClassName} aria-label={uncertain ? "Reintentar operación pendiente" : submitAriaLabel} disabled={pending}>{submitIcon && !uncertain ? <><Icon name={submitIcon} className="glyph-icon" /><span className="hidden sm:inline">{pending ? "Guardando…" : submitLabel}</span></> : pending ? "Guardando…" : uncertain ? "Reintentar operación pendiente" : submitLabel}</button>
  </form>;
}
