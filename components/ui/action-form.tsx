"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { AccountFormAction, AccountFormState } from "@/lib/auth/form-state";

export function ActionForm({ action, requestId: initialRequestId, hiddenFields = {}, submitLabel, children, resetOnSuccess = false }: {
  action: AccountFormAction; requestId: string; hiddenFields?: Record<string, string>; submitLabel: string; children?: ReactNode; resetOnSuccess?: boolean;
}) {
  const router = useRouter();
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
        router.refresh();
      } else if (result.retryable) setUncertain(true);
      else { pendingData.current = null; setUncertain(false); requestId.current = crypto.randomUUID(); }
    } catch {
      setUncertain(true);
      setState({ success: false, message: "No pudimos confirmar el resultado. Reintenta la operación pendiente; conservamos los mismos datos para evitar aplicarla dos veces." });
    } finally { busy.current = false; setPending(false); }
  }
  return <form method="post" onSubmit={submit} onChange={(event) => { event.currentTarget.dataset.dirty = "true"; }} className="mt-4 space-y-4" aria-busy={pending}>
    {Object.entries(hiddenFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <fieldset disabled={pending || uncertain} className="space-y-4">{children}</fieldset>
    <p role="status" className={`text-sm leading-6 ${state.success ? "text-brand" : "text-warning"}`}>{state.message}</p>
    <button className="button-primary" disabled={pending}>{pending ? "Guardando…" : uncertain ? "Reintentar operación pendiente" : submitLabel}</button>
  </form>;
}
