"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { registerAction } from "@/app/(account)/actions";
import { PasswordField } from "./password-field";
import { FormField } from "@/components/ui/form-field";

export function RegistrationForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    try {
      const result = await registerAction({ success: false, message: "" }, data);
      if (!result.success) { setMessage(result.message); return; }
      const login = await signIn("credentials", { email: data.get("email"), password: data.get("password"), redirect: false, callbackUrl: "/inventory" });
      if (login?.ok && !login.error) window.location.assign("/inventory");
      else setMessage("No pudimos iniciar la sesión automáticamente. Si ya tienes una cuenta, inicia sesión con tu contraseña o recupera tu acceso.");
    } catch {
      setMessage("No pudimos conectar. Intenta de nuevo o inicia sesión si tu cuenta ya se creó.");
    } finally { setPending(false); }
  }
  return <form method="post" onSubmit={submit} className="stack form-flow" aria-busy={pending}>
    <FormField name="name" label="Tu nombre" autoComplete="name" required maxLength={100} />
    <FormField name="email" label="Correo electrónico" type="email" autoComplete="email" required maxLength={254} />
    <PasswordField name="password" label="Contraseña" autoComplete="new-password" required minLength={12} maxLength={128} hint="De 12 a 128 caracteres. Puedes usar una frase que recuerdes." />
    <p role="status" className="feedback text-warning">{message}</p>
    <button className="action-primary action-block" disabled={pending}>{pending ? "Creando tu cuenta…" : "Crear cuenta y entrar"}</button>
  </form>;
}
