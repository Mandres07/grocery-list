import Link from "next/link";
import { AccountForm } from "@/components/auth/account-form";
import { registerAction } from "../actions";

export default function RegisterPage() {
  return <>
    <h1 className="page-title">Un espacio para tu hogar</h1>
    <p className="mt-3 text-sm leading-6 text-muted">Crea tu cuenta y verifica tu correo. Después podrás crear un hogar o esperar una invitación.</p>
    <AccountForm action={registerAction} submitLabel="Crear cuenta" passwordHint fields={[
      { name: "name", label: "Tu nombre", autoComplete: "name" },
      { name: "email", label: "Correo electrónico", type: "email", autoComplete: "email" },
      { name: "password", label: "Contraseña", type: "password", autoComplete: "new-password" },
    ]} />
    <nav aria-label="Opciones de cuenta" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <Link href="/sign-in" className="inline-flex min-h-12 items-center underline underline-offset-4">Ya tengo una cuenta</Link>
      <Link href="/verify-email" className="inline-flex min-h-12 items-center underline underline-offset-4">Solicitar otro correo de verificación</Link>
    </nav>
  </>;
}
