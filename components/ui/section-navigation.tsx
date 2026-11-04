"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export function SectionNavigation({ label, items, active }: { label: string; items: ReadonlyArray<{ href: string; label: string }>; active: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const revealActive = () => {
      const link = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!link) return;
      const bounds = nav.getBoundingClientRect();
      const selected = link.getBoundingClientRect();
      const inset = parseFloat(getComputedStyle(nav).paddingInlineStart) + nav.clientLeft;
      // Scroll only the tab strip, preserving the page position and keyboard focus.
      if (selected.left < bounds.left + inset) nav.scrollLeft += selected.left - bounds.left - inset;
      else if (selected.right > bounds.right - inset) nav.scrollLeft += selected.right - bounds.right + inset;
    };
    revealActive();
    const observer = new ResizeObserver(revealActive);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [active]);
  return <nav ref={ref} aria-label={label} className="section-navigation">
    {items.map(({ href, label }) => <Link key={href} href={href} aria-current={href === active ? "page" : undefined} className="section-link">{label}</Link>)}
  </nav>;
}
