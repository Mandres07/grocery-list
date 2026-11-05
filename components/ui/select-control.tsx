import type { SelectHTMLAttributes } from "react";
import { Icon } from "./icon";

export function SelectControl({ children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <span className="control-select">
    <select {...props} className={`control${className ? ` ${className}` : ""}`}>{children}</select>
    <Icon name="chevron-down" className="glyph-icon" />
  </span>;
}
