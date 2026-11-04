"use client";

import { useActionState, useId } from "react";
import type { AccountFormAction } from "@/lib/auth/form-state";

interface Field {
  name: "name" | "email" | "password";
  label: string;
  type?: "text" | "email" | "password";
  autoComplete: string;
}

export function AccountForm({ action, fields = [], submitLabel, token, passwordHint = false, hiddenFields = {}, repeatable = false }: {
  action: AccountFormAction;
  fields?: Field[];
  submitLabel: string;
  token?: string;
  passwordHint?: boolean;
  hiddenFields?: Record<string, string>;
  repeatable?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { message: "", success: false });
  const id = useId();
  return (
    <form action={formAction} className="mt-6 space-y-5" aria-busy={pending}>
      {token !== undefined && <input type="hidden" name="token" value={token} />}
      {Object.entries(hiddenFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={`${id}-${field.name}`} className="form-label">{field.label}</label>
          <input id={`${id}-${field.name}`} name={field.name} type={field.type ?? "text"} autoComplete={field.autoComplete}
            required minLength={field.type === "password" ? 12 : undefined}
            maxLength={field.type === "password" ? 128 : field.type === "email" ? 254 : 100}
            aria-describedby={field.name === "password" && passwordHint ? `${id}-password-hint` : undefined}
            className="form-input" />
          {field.name === "password" && passwordHint && <p id={`${id}-password-hint`} className="mt-2 text-xs leading-5 text-muted">De 12 a 128 caracteres. Puedes usar una frase que recuerdes.</p>}
        </div>
      ))}
      <p role="status" aria-live="polite" className={`text-sm leading-6 ${state.success ? "text-brand" : "text-warning"}`}>{state.message}</p>
      <button type="submit" disabled={pending || (state.success && !repeatable)} className="button-primary">
        {pending ? "Un momento…" : state.success && !repeatable ? "Listo" : submitLabel}
      </button>
    </form>
  );
}
