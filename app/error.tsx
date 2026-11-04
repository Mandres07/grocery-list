"use client";

import { ErrorNotice } from "@/components/ui/error-notice";

export default function AppError({ reset }: { reset: () => void }) {
  return <div className="content-shell py-10"><main className="surface-raised mt-8"><ErrorNotice title="No pudimos cargar tu espacio" message="Revisa tu conexión e intenta de nuevo. Si estás trabajando localmente, comprueba que MongoDB esté iniciado." reset={reset} href="/" linkLabel="Volver al inicio" /></main></div>;
}
