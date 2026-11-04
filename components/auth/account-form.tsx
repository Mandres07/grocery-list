"use client";

import { PasswordField } from "./password-field";
import { FormField } from "@/components/ui/form-field";
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
    <form action={formAction} className="stack form-flow" aria-busy={pending}>
      {token !== undefined && <input type="hidden" name="token" value={token} />}
      {Object.entries(hiddenFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      {fields.map((field) => {
        const props = { id: `${id}-${field.name}`, name: field.name, label: field.label, autoComplete: field.autoComplete, required: true,
          minLength: field.type === "password" ? 12 : undefined, maxLength: field.type === "password" ? 128 : field.type === "email" ? 254 : 100,
          hint: field.name === "password" && passwordHint ? "De 12 a 128 caracteres. Puedes usar una frase que recuerdes." : undefined };
        return field.type === "password" ? <PasswordField key={field.name} {...props} /> : <FormField key={field.name} {...props} type={field.type ?? "text"} />;
      })}
      <p role="status" aria-live="polite" className={`feedback ${state.success ? "text-brand" : "text-warning"}`}>{state.message}</p>
      <button type="submit" disabled={pending || (state.success && !repeatable)} className="action-primary">
        {pending ? "Un momento…" : state.success && !repeatable ? "Listo" : submitLabel}
      </button>
    </form>
  );
}
