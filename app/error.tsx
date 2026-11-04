"use client";

import { Brand } from "@/components/ui/brand";
import { ErrorNotice } from "@/components/ui/error-notice";

export default function AppError({ reset }: { reset: () => void }) {
  return <div className="mx-auto max-w-3xl px-5 py-10"><Brand /><main className="surface-panel mt-8"><ErrorNotice title="No pudimos cargar tu espacio" message="Revisa tu conexión e intenta de nuevo. Si estás trabajando localmente, comprueba que MongoDB esté iniciado." reset={reset} href="/" linkLabel="Volver al inicio" /></main></div>;
}
