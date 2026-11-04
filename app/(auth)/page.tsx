import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { RegistrationForm } from "@/components/auth/registration-form";

export default async function HomePage() {
  if (await getCurrentUser()) redirect("/household");
  return <section id="registration" aria-labelledby="registration-title" className="surface-raised">
    <h2 id="registration-title" className="heading-title">Crea tu cuenta</h2>
    <p className="mt-2 text-sm leading-6 text-muted">Entra de una vez. Confirma tu correo para compartir tu hogar y gestionar tus productos.</p>
    <RegistrationForm />
    <p className="mt-3 text-sm">¿Ya tienes una cuenta? <Link href="/sign-in" className="action-link">Inicia sesión</Link></p>
  </section>;
}
