"use client";

export function QuantityInput({ label, value, onChange, form, name = "quantity", min = 1, max = Number.MAX_SAFE_INTEGER, disabled = false, compact = false }: {
  label: string; value: string; onChange: (value: string) => void; form?: string; name?: string; min?: number; max?: number; disabled?: boolean; compact?: boolean;
}) {
  const quantity = Number(value);
  const valid = /^\d+$/.test(value) && Number.isSafeInteger(quantity) && quantity >= min && quantity <= max;
  return <div className={`quantity-controls${compact ? " quantity-controls-compact" : ""}`} role="group" aria-label={`Ajustar cantidad de ${label}`}>
    <button type="button" className="action-secondary text-xl" aria-label={`Restar una unidad de ${label}`} disabled={disabled || !valid || quantity <= min} onClick={() => onChange(String(quantity - 1))}>−</button>
    <input form={form} type="number" inputMode="numeric" name={name} aria-label={`Cantidad de ${label}`} className="control control-quantity" min={min} max={max} step={1} required value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    <button type="button" className="action-secondary text-xl" aria-label={`Sumar una unidad de ${label}`} disabled={disabled || !valid || quantity >= max} onClick={() => onChange(String(quantity + 1))}>+</button>
  </div>;
}
