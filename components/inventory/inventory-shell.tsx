import { SectionNavigation } from "@/components/ui/section-navigation";
import type { ReactNode } from "react";

const sections = [
  { href: "/inventory", label: "Productos" },
  { href: "/inventory/categories", label: "Categorías" },
  { href: "/inventory/activity", label: "Actividad" },
] as const;

export function InventoryShell({ title, description, active, action, children }: {
  title: string; description: string; active: typeof sections[number]["href"]; action?: ReactNode; children: ReactNode;
}) {
  return <>
    <div className="section-header"><h1 className="heading-title">{title}</h1>{action}</div>
    <p className="sr-only">{description}</p>
    <SectionNavigation label="Secciones del inventario" items={sections} active={active} />
    {children}
  </>;
}
