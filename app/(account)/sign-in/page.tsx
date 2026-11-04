import Link from "next/link";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/household");
  const { error } = await searchParams;
  return <>
    <h1 className="page-title">Qué bueno verte</h1>
    <p className="mt-3 text-sm leading-6 text-muted">Entra a tu cuenta para continuar con tu hogar.</p>
    {error && <p role="status" className="mt-4 text-sm text-warning">No pudimos iniciar sesión. Intenta de nuevo con tu correo y contraseña.</p>}
    <SignInForm />
    <nav aria-label="Opciones de cuenta" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <Link href="/forgot-password" className="inline-flex min-h-12 items-center underline underline-offset-4">Olvidé mi contraseña</Link>
      <Link href="/verify-email" className="inline-flex min-h-12 items-center underline underline-offset-4">Verificar mi correo</Link>
      <Link href="/register" className="inline-flex min-h-12 items-center underline underline-offset-4">Crear cuenta</Link>
    </nav>
  </>;
}
