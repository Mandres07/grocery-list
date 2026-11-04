import type { ReactNode } from "react";

export function RecordRow({ title, description, status, children, leading }: { title: ReactNode; description?: ReactNode; status?: ReactNode; leading?: ReactNode; children?: ReactNode }) {
  return <div className="record-row">
    {leading}
    <div className="record-content"><div className="record-title">{title}</div>{description && <div className="record-description">{description}</div>}{status && <div className="record-status"><span className="status-label">{status}</span></div>}</div>
    {children && <div className="record-actions">{children}</div>}
  </div>;
}
