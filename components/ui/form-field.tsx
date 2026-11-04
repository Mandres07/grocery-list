import { useId, type InputHTMLAttributes } from "react";

export function FormField({ label, hint, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return <div>
    <label htmlFor={fieldId} className="form-label">{label}</label>
    <input {...props} id={fieldId} aria-describedby={hint ? `${fieldId}-hint` : props["aria-describedby"]} className="form-input" />
    {hint && <p id={`${fieldId}-hint`} className="mt-2 text-xs leading-5 text-muted">{hint}</p>}
  </div>;
}
