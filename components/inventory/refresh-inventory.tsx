"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => { window.removeEventListener("online", listener); window.removeEventListener("offline", listener); };
}

export function RefreshInventory() {
  const router = useRouter();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  useEffect(() => {
    function refresh() {
      const online = navigator.onLine;
      if (online && document.visibilityState === "visible" && !document.querySelector('form[data-dirty="true"], form[aria-busy="true"]')) router.refresh();
    }
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
  return <p role="status" className={`mt-2 text-xs leading-5 ${online ? "text-muted" : "text-warning"}`}>
    {!online ? "Sin conexión. Los cambios no se guardan sin conexión; espera a recuperar internet y reintenta las operaciones pendientes." : "Se actualiza automáticamente al volver a esta pantalla."}
  </p>;
}
