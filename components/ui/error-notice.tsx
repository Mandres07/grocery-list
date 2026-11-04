"use client";

import Link from "next/link";

export function ErrorNotice({ title, message, reset, href, linkLabel }: { title: string; message: string; reset: () => void; href: string; linkLabel: string }) {
  return <>
    <h1 className="heading-title">{title}</h1>
    <p className="mt-4 text-sm leading-6 text-muted">{message}</p>
    <button onClick={reset} className="action-secondary mt-6">Volver a intentar</button>
    <Link href={href} className="navigation-link mt-3 underline">{linkLabel}</Link>
  </>;
}
