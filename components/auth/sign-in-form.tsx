"use client";

import { useState, type FormEvent } from "react";
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
        setMessage("No pudimos iniciar sesión. Revisa tus datos, verifica tu correo o espera unos minutos si ya intentaste varias veces.");
      } else {
        window.location.assign("/household");
      }
    } catch {
      setMessage("No pudimos conectar. Revisa tu conexión e intenta de nuevo.");
    } finally { setPending(false); }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5" aria-busy={pending}>
      <div><label htmlFor="email" className="form-label">Correo electrónico</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} className="form-input" /></div>
      <div><label htmlFor="password" className="form-label">Contraseña</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={128} className="form-input" /></div>
      <p role="status" className="text-sm leading-6 text-warning">{message}</p>
      <button disabled={pending} className="button-primary">{pending ? "Entrando…" : "Iniciar sesión"}</button>
    </form>
  );
}

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  return <div>
    <button disabled={pending} onClick={async () => {
      setPending(true);
      setFailed(false);
      try { await signOut({ callbackUrl: "/sign-in" }); }
      catch { setFailed(true); setPending(false); }
    }} className="button-secondary">{pending ? "Saliendo…" : "Cerrar sesión"}</button>
    {failed && <p role="status" className="mt-2 text-sm text-warning">No pudimos cerrar la sesión. Intenta de nuevo.</p>}
  </div>;
}
