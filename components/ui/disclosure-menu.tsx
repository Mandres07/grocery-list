"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";

export function DisclosureMenu({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (ref.current?.open && event.target instanceof Node && !ref.current.contains(event.target)) ref.current.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    }
    function resize() {
      if (ref.current) ref.current.open = false;
    }
    window.addEventListener("resize", resize);
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return <details ref={ref} className="group relative" onClick={(event) => {
    if (event.target instanceof Element && !event.target.closest("summary")) event.currentTarget.open = false;
  }}>
    <summary className="action-quiet action-inverse action-icon disclosure-toggle cursor-pointer list-none" aria-label={label}>
      <Icon name="menu" className="size-6 group-open:hidden" />
      <Icon name="close" className="hidden size-6 group-open:block" />
      <span className="hidden sm:inline">Menú</span>
    </summary>
    {children}
  </details>;
}
