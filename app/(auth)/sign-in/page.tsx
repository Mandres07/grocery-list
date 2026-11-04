import Link from "next/link";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/inventory");
  const { error } = await searchParams;
  return <section aria-labelledby="sign-in-title" className="surface-raised">
    <h2 id="sign-in-title" className="heading-title">Qué bueno verte</h2>
    <p className="mt-2 text-sm leading-6 text-muted">Entra a tu cuenta para continuar con tu hogar.</p>
    {error && <p role="status" className="mt-4 text-sm text-warning">No pudimos iniciar sesión. Intenta de nuevo con tu correo y contraseña.</p>}
    <SignInForm />
    <nav aria-label="Opciones de cuenta" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <Link href="/forgot-password" className="action-link font-normal">Olvidé mi contraseña</Link>
      <Link href="/verify-email" className="action-link font-normal">Verificar mi correo</Link>
    </nav>
    <p className="mt-3 text-sm">¿Aún no tienes una cuenta? <Link href="/" className="action-link">Crea tu cuenta</Link></p>
  </section>;
}
