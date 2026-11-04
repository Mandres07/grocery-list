"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Modal } from "./modal";
import { Icon } from "./icon";
import { FormField } from "./form-field";

export function ListFilters({ action, label, placeholder, query, activeFilters, children }: {
  action: string; label: string; placeholder: string; query: string; activeFilters: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const active = Boolean(query || activeFilters);
  return <>
    <button type="button" className={`action-secondary action-icon${active ? " bg-sage text-brand" : ""}`} aria-label={active ? "Buscar y filtrar · Filtros activos" : "Buscar y filtrar"} title={active ? "Buscar y filtrar · Filtros activos" : "Buscar y filtrar"} onClick={() => setOpen(true)}>
      <Icon name="filter" className="glyph-icon" />{active && <span className="indicator-dot bg-brand" />}
    </button>
    <Modal open={open} title="Buscar y filtrar" onClose={() => setOpen(false)}>
      <form action={action} method="get" className="stack form-flow" key={String(open)}>
        <FormField label={label} name="q" type="search" placeholder={placeholder} maxLength={160} defaultValue={query} />
        {children}
        <div className="flex flex-wrap gap-2"><button className="action-primary">Aplicar filtros</button><Link href={action} className="action-secondary" onClick={() => setOpen(false)}>Limpiar filtros</Link></div>
      </form>
    </Modal>
  </>;
}
