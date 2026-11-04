import Link from "next/link";
import { AccountForm } from "@/components/auth/account-form";
import { validToken } from "@/lib/auth/validation";
import { resetPasswordAction } from "../actions";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <div className="measure-narrow">
    <h1 className="heading-title">Una nueva contraseña</h1>
    <p className="mt-3 text-sm leading-6 text-muted">Al cambiar tu contraseña, las sesiones anteriores perderán acceso. Inicia sesión de nuevo en tus dispositivos.</p>
    {validToken(token) ? <AccountForm action={resetPasswordAction} token={token} submitLabel="Guardar contraseña" passwordHint fields={[{ name: "password", label: "Nueva contraseña", type: "password", autoComplete: "new-password" }]} /> : <p role="status" className="mt-5 text-sm text-warning">Falta un enlace válido. Solicita uno nuevo para continuar.</p>}
    <nav aria-label="Opciones de cuenta" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <Link href="/forgot-password" className="inline-flex min-h-12 items-center underline underline-offset-4">Solicitar otro enlace</Link>
      <Link href="/sign-in" className="inline-flex min-h-12 items-center underline underline-offset-4">Iniciar sesión</Link>
    </nav>
  </div>;
}
