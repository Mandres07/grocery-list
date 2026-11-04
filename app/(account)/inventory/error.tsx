"use client";

import { ErrorNotice } from "@/components/ui/error-notice";

export default function InventoryError({ reset }: { reset: () => void }) {
  return <ErrorNotice title="No pudimos cargar el inventario" message="Revisa tu conexión e intenta de nuevo. Si usaste un filtro que ya no está disponible, vuelve al inventario sin filtros. Los cambios sin conexión no se guardan automáticamente." reset={reset} href="/inventory" linkLabel="Abrir inventario sin filtros" />;
}
