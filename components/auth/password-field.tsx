"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { FormField } from "@/components/ui/form-field";

export function PasswordField({ id, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string; hint?: string }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return <FormField {...props} id={inputId} type={visible ? "text" : "password"} trailing={
    <button type="button" className="action-reveal" aria-controls={inputId} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setVisible(!visible)}>{visible ? "Ocultar" : "Mostrar"}</button>
  } />;
}
