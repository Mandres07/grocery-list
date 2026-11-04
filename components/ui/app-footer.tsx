import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

export function AppFooter() {
  return <footer className="border-t border-line text-xs text-muted">
    <div className="content-shell flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
      <div><p className="font-semibold text-brand">{APP_NAME}</p><p>{APP_TAGLINE}</p></div>
      <div className="flex flex-wrap items-center gap-x-4">
        <p>Hecho en <span role="img" aria-label="Panamá">🇵🇦</span> por <a href="https://mandres.dev/" target="_blank" rel="noopener noreferrer" className="action-link text-accent hover:text-brand">mandres.dev</a></p>
        <p>© {new Date().getFullYear()} {APP_NAME}</p>
      </div>
    </div>
  </footer>;
}
