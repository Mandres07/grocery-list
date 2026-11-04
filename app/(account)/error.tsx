"use client";

import Link from "next/link";

export default function AccountError({ reset }: { reset: () => void }) {
  return <>
    <h1 className="font-display text-3xl">No pudimos cargar tu espacio</h1>
    <p className="mt-4 text-sm leading-6 text-muted">Intenta de nuevo en unos minutos. Si estás trabajando localmente, comprueba que MongoDB esté iniciado.</p>
    <button onClick={reset} className="mt-6 min-h-12 rounded-full bg-brand px-6 text-sm font-semibold text-white">Volver a intentar</button>
    <Link href="/sign-in" className="ml-4 inline-flex min-h-12 items-center text-sm underline">Iniciar sesión</Link>
  </>;
}
