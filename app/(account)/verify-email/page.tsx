import Link from "next/link";
import { AccountForm } from "@/components/auth/account-form";
import { validToken } from "@/lib/auth/validation";
import { resendVerificationAction, verifyEmailAction } from "../actions";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <>
    <h1 className="page-title">Verifica tu correo</h1>
    <p className="mt-3 text-sm leading-6 text-muted">Confirma tu correo para proteger el acceso a tu hogar. Los enlaces vencen en 24 horas.</p>
    {validToken(token) ? <AccountForm action={verifyEmailAction} token={token} submitLabel="Confirmar mi correo" /> : token !== undefined && <p role="status" className="mt-4 text-sm text-warning">El enlace no es válido. Solicita uno nuevo.</p>}
    <section aria-labelledby="resend-title" className="mt-8 border-t border-line pt-6">
      <h2 id="resend-title" className="text-lg font-semibold">¿Necesitas otro enlace?</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Revisa tu carpeta de correo no deseado. Puedes solicitar otro envío después de un minuto.</p>
      <AccountForm action={resendVerificationAction} submitLabel="Enviar enlace" fields={[{ name: "email", label: "Correo electrónico", type: "email", autoComplete: "email" }]} />
    </section>
    <Link href="/household" className="mt-6 inline-flex min-h-12 items-center text-sm underline underline-offset-4">Continuar a mi cuenta</Link>
  </>;
}
