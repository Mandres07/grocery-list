import { useId, type ReactNode } from "react";
import { Icon, type IconName } from "./icon";

export function SectionPanel({ title, description, icon, children }: { title: string; description?: string; icon: IconName; children: ReactNode }) {
  const titleId = useId();
  return <section className="surface-raised" aria-labelledby={titleId}>
    <div className="flex items-start gap-3">
      <span className="symbol-soft"><Icon name={icon} className="glyph-icon" /></span>
      <div className="min-w-0"><h2 id={titleId} className="heading-section break-words">{title}</h2>{description && <p className="mt-1 text-sm text-muted">{description}</p>}</div>
    </div>
    <div className="mt-4">{children}</div>
  </section>;
}
