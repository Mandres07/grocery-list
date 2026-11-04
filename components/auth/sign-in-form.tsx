"use client";

import { useState, type FormEvent } from "react";
import { PasswordField } from "./password-field";
import { FormField } from "@/components/ui/form-field";
import { signIn, signOut } from "next-auth/react";

export function SignInForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    try {
      const result = await signIn("credentials", { email: data.get("email"), password: data.get("password"), redirect: false, callbackUrl: "/household" });
      if (!result?.ok || result.error) {
        setMessage("No pudimos iniciar sesión. Revisa tus datos o espera unos minutos si ya intentaste varias veces.");
      } else {
        window.location.assign("/household");
      }
    } catch {
      setMessage("No pudimos conectar. Revisa tu conexión e intenta de nuevo.");
    } finally { setPending(false); }
  }

  return (
    <form method="post" onSubmit={submit} className="stack form-flow" aria-busy={pending}>
      <FormField label="Correo electrónico" name="email" type="email" autoComplete="email" required maxLength={254} />
      <PasswordField label="Contraseña" name="password" autoComplete="current-password" required maxLength={128} />
      <p role="status" className="feedback text-warning">{message}</p>
      <button disabled={pending} className="action-primary action-block">{pending ? "Entrando…" : "Iniciar sesión"}</button>
    </form>
  );
}

export function SignOutButton({ className = "action-secondary" }: { className?: string }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  return <div>
    <button disabled={pending} onClick={async () => {
      setPending(true);
      setFailed(false);
      try { await signOut({ callbackUrl: "/sign-in" }); }
      catch { setFailed(true); setPending(false); }
    }} className={className}>{pending ? "Saliendo…" : "Cerrar sesión"}</button>
    {failed && <p role="status" className="mt-2 text-sm text-warning">No pudimos cerrar la sesión. Intenta de nuevo.</p>}
  </div>;
}
