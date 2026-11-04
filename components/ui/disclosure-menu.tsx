"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";

export function DisclosureMenu({ label, children, trigger, triggerClassName = "action-quiet action-inverse action-icon disclosure-toggle cursor-pointer list-none", closeOnContentClick = true }: {
  label: string; children: ReactNode; trigger?: ReactNode; triggerClassName?: string; closeOnContentClick?: boolean;
}) {
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
  return <details ref={ref} className="group relative reveal-disclosure" onClick={(event) => {
    if (event.target instanceof Element && !event.target.closest("summary") && (closeOnContentClick || event.target.closest("a, button"))) event.currentTarget.open = false;
  }}>
    <summary className={triggerClassName} aria-label={label}>
      {trigger ?? <>
      <Icon name="menu-toggle" className="size-6 morph-menu" />
      <span className="hidden sm:inline">Menú</span>
      </>}
    </summary>
    {children}
  </details>;
}
