import { useId, type InputHTMLAttributes, type ReactNode } from "react";

export function FormField({ label, hint, id, trailing, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; trailing?: ReactNode }) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return <div>
    <label htmlFor={fieldId} className="field-label">{label}</label>
    <div className={trailing ? "control-group" : undefined}><input {...props} id={fieldId} aria-describedby={hint ? `${fieldId}-hint` : props["aria-describedby"]} className="control" />{trailing}</div>
    {hint && <p id={`${fieldId}-hint`} className="field-hint">{hint}</p>}
  </div>;
}
