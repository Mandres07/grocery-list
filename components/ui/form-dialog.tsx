"use client";

import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "./icon";
import { Modal } from "./modal";
import { ActionForm, type FormStatus } from "./action-form";
import type { AccountFormAction } from "@/lib/auth/form-state";

export function FormDialog({ title, triggerLabel, triggerAriaLabel, submitLabel, action, hiddenFields, children, triggerClassName = "action-primary", floating = false, triggerIcon, disabled = false }: {
  title: string; triggerLabel: string; triggerAriaLabel?: string; submitLabel: string; action: AccountFormAction;
  hiddenFields: Record<string, string>; children?: ReactNode; triggerClassName?: string; floating?: boolean; triggerIcon?: IconName; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  function close() { if (status === "idle") setOpen(false); }
  return <>
    <button type="button" disabled={disabled} className={`${triggerClassName}${floating ? " action-float-compact" : ""}`} aria-label={triggerAriaLabel ?? triggerLabel} title={triggerAriaLabel ?? triggerLabel} aria-haspopup="dialog" aria-expanded={open} data-suppressed={floating && open} onClick={() => { setRequestId(crypto.randomUUID()); setStatus("idle"); setOpen(true); }}>{floating ? <><Icon name="plus" className="glyph-icon morph-add" data-open={open} /><span className="hidden sm:inline">{triggerLabel}</span></> : triggerIcon ? <Icon name={triggerIcon} className="glyph-icon" /> : triggerLabel}</button>
    <Modal open={open} title={title} onClose={close} dismissible={status === "idle"} floatingClose={floating ? <button type="button" className="action-primary action-float-compact sm:hidden" aria-label="Cerrar formulario" disabled={status !== "idle"} onClick={close}><Icon name="plus" className="glyph-icon morph-add" data-open={open} /></button> : undefined}>
      <ActionForm key={requestId} action={action} requestId={requestId} hiddenFields={hiddenFields} submitLabel={submitLabel} embedded onStatusChange={setStatus} onSuccess={() => setOpen(false)}>
        {children}
      </ActionForm>
    </Modal>
  </>;
}
