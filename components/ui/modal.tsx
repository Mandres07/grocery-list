"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./icon";

export function Modal({ open, title, onClose, dismissible = true, children, floatingClose, className = "" }: {
  open: boolean; title: string; onClose: () => void; dismissible?: boolean; children: ReactNode; floatingClose?: ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  function dismiss() { if (dismissible) onClose(); }
  return <dialog ref={ref} aria-labelledby={titleId} className={`modal-surface${className ? ` ${className}` : ""}`} onCancel={(event) => { event.preventDefault(); dismiss(); }} onClick={(event) => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismiss();
  }}>
    <div className="modal-content">
      <div className="section-header">
        <h2 id={titleId} className="heading-section">{title}</h2>
        <button type="button" className="action-quiet action-icon" aria-label="Cerrar ventana" disabled={!dismissible} onClick={dismiss}><Icon name="close" className="size-5" /></button>
      </div>
      {children}
      {!dismissible && <p className="field-hint">Confirma o reintenta el guardado antes de cerrar esta ventana.</p>}
    </div>
    {floatingClose}
  </dialog>;
}
