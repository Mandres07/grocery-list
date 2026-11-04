"use client";

import { ErrorNotice } from "@/components/ui/error-notice";

export default function AccountError({ reset }: { reset: () => void }) {
  return <ErrorNotice title="No pudimos cargar tu espacio" message="Intenta de nuevo en unos minutos. Si estás trabajando localmente, comprueba que MongoDB esté iniciado." reset={reset} href="/sign-in" linkLabel="Iniciar sesión" />;
}
