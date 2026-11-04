import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { RegistrationForm } from "@/components/auth/registration-form";
import { AppHeader } from "@/components/ui/app-header";
import { Icon } from "@/components/ui/icon";

export default async function HomePage() {
  if (await getCurrentUser()) redirect("/household");
  return <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
    <a href="#main" className="sr-only focus:not-sr-only">Saltar al contenido</a>
    <AppHeader user={null} />
    <main id="main" className="grid items-center gap-10 py-8 sm:py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-16">
      <section aria-labelledby="welcome-title">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-sage px-3 py-2 text-xs font-semibold text-brand"><Icon name="leaf" className="size-4" /> Un poquito de orden, todos los días</span>
        <h1 id="welcome-title" className="max-w-lg font-display text-5xl leading-[1.08] tracking-tight sm:text-6xl">Tu hogar,<br />en <span className="text-brand italic">orden.</span></h1>
        <p className="mt-6 max-w-sm text-base leading-7 text-muted">Para saber qué hay, qué falta y qué comprar. Un espacio sencillo para cuidar de casa, juntos.</p>
        <a href="#registration" className="mt-7 inline-flex min-h-12 items-center justify-center gap-5 rounded-full bg-brand px-6 text-sm font-semibold text-surface hover:bg-brand-hover">Crear mi cuenta <Icon name="arrow" className="size-4" /></a>
        <ul className="mt-10 space-y-4 text-sm">
          <li className="flex items-center gap-3"><Icon name="check" className="size-4 shrink-0 text-brand" /> Tu despensa y los esenciales del hogar</li>
          <li className="flex items-center gap-3"><Icon name="check" className="size-4 shrink-0 text-brand" /> Cantidades claras, sin complicaciones</li>
          <li className="flex items-center gap-3"><Icon name="check" className="size-4 shrink-0 text-brand" /> Pensado para compartir en familia</li>
        </ul>
      </section>
      <section id="registration" aria-labelledby="registration-title" className="surface-panel scroll-mt-6 shadow-lg shadow-brand/5">
        <h2 id="registration-title" className="page-title">Un espacio para tu hogar</h2>
        <p className="mt-3 text-sm leading-6 text-muted">Crea tu cuenta y entra de una vez. Confirma tu correo para compartir tu hogar y gestionar tus productos.</p>
        <RegistrationForm />
        <p className="mt-6 text-sm">¿Ya tienes una cuenta? <Link href="/sign-in" className="inline-flex min-h-12 items-center font-semibold underline underline-offset-4">Inicia sesión</Link></p>
      </section>
    </main>
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-6 text-xs text-muted"><span>Un hogar. Un equipo.</span><span>Hecho para lo cotidiano.</span></footer>
  </div>;
}
