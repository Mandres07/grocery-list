import Link from "next/link";
import { AccountForm } from "@/components/auth/account-form";
import { forgotPasswordAction } from "../actions";

export default function ForgotPasswordPage() {
  return <>
    <h1 className="page-title">Recupera tu acceso</h1>
    <p className="mt-3 text-sm leading-6 text-muted">Te enviaremos un enlace para cambiar tu contraseña si tienes una cuenta con este correo. El enlace vence en una hora.</p>
    <AccountForm action={forgotPasswordAction} submitLabel="Enviar enlace de recuperación" fields={[{ name: "email", label: "Correo electrónico", type: "email", autoComplete: "email" }]} />
    <nav aria-label="Opciones de cuenta" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <Link href="/sign-in" className="inline-flex min-h-12 items-center underline underline-offset-4">Volver a iniciar sesión</Link>
      <Link href="/verify-email" className="inline-flex min-h-12 items-center underline underline-offset-4">Aún no he verificado mi correo</Link>
    </nav>
  </>;
}
